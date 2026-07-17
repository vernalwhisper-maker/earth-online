// WebLLM 本地模型引擎封装
// 在浏览器内通过 WebGPU 运行 LLM，无需服务器
// 使用动态 import() 避免将 ~6MB 库打包到主 JS 中

let engine = null;
let engineReady = false;
let downloadProgress = 0;
let webllmModule = null;
let cancelRequested = false;

/**
 * 初始化 WebLLM 引擎。首次会自动下载模型到浏览器缓存。
 * @param {string} modelId - 模型 ID
 * @param {function} onProgress - 下载进度回调 (progress: 0-100, text: string)
 * @param {function} onCancel - 检查是否取消的函数 () => boolean
 * @returns {Promise<boolean>}
 */
export async function initWebLLM(modelId, onProgress, onCancel) {
  if (engineReady) return true;
  cancelRequested = false;
  try {
    downloadProgress = 0;
    if (!webllmModule) {
      webllmModule = await import("@mlc-ai/web-llm");
    }
    engine = await webllmModule.CreateMLCEngine(
      modelId || "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
      {
        initProgressCallback: (report) => {
          const pct = Math.round(report.progress * 100);
          downloadProgress = pct;
          onProgress?.(pct, report.text);
          // 检查取消请求
          if ((onCancel && onCancel()) || cancelRequested) {
            throw new Error("Download cancelled by user");
          }
        },
      }
    );
    engineReady = true;
    return true;
  } catch (err) {
    if (err.message === "Download cancelled by user") {
      console.log("WebLLM download cancelled");
    } else {
      console.error("WebLLM init failed:", err);
    }
    engineReady = false;
    return false;
  }
}

/** 请求取消下载 */
export function cancelDownload() {
  cancelRequested = true;
}

/** 彻底清除模型缓存（WebLLM 内置 API + Cache Storage + IndexedDB） */
export async function clearModelCache(modelId) {
  try {
    // 0. 使用 WebLLM 内置清理函数
    try {
      const mod = await import("@mlc-ai/web-llm");
      if (mod.deleteModelAllInfoInCache) await mod.deleteModelAllInfoInCache(modelId || "");
    } catch {}

    // 1. 清除所有可能包含模型数据的 Cache Storage
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys
        .filter((k) => k.includes("cache") || k.includes("webllm") || k.includes("mlc") || k.includes("model") || k.includes("llm") || k.includes("tvm") || k.includes("shader") || k.includes("wasm"))
        .map((k) => caches.delete(k))
    );
    // 2. 清除所有模型相关的 IndexedDB
    const dbs = await indexedDB.databases?.() || [];
    await Promise.all(
      dbs
        .filter((d) => d.name?.includes("webllm") || d.name?.includes("mlc") || d.name?.includes("tvm") || d.name?.includes("model"))
        .map((d) => indexedDB.deleteDatabase(d.name))
    );
  } catch (err) {
    console.warn("clearModelCache:", err);
  }
}

/** 扫描模型缓存残留 */
export async function scanModelCache(modelId) {
  const residues = [];
  try {
    // 使用 WebLLM 内置检测函数
    try {
      const mod = await import("@mlc-ai/web-llm");
      if (mod.hasModelInCache && modelId) {
        const has = await mod.hasModelInCache(modelId);
        if (has) residues.push({ type: "WebLLM 缓存", name: modelId, size: "存在" });
      }
    } catch {}

    // Cache Storage — 搜索所有可能包含模型数据的缓存
    const cacheKeys = await caches.keys();
    for (const k of cacheKeys) {
      if (k.includes("cache") || k.includes("webllm") || k.includes("mlc") || k.includes("model") || k.includes("llm") || k.includes("tvm") || k.includes("shader") || k.includes("wasm")) {
        const cache = await caches.open(k);
        const requests = await cache.keys();
        let totalSize = 0;
        for (const req of requests) {
          try { const r = await cache.match(req); if (r) totalSize += (await r.blob()).size; } catch {}
        }
        const sizeLabel = totalSize > 1048576 ? (totalSize / 1048576).toFixed(1) + "MB" : (totalSize / 1024).toFixed(1) + "KB";
        residues.push({ type: "Cache Storage", name: k, size: requests.length + "项 / " + sizeLabel });
      }
    }
    // IndexedDB
    const dbs = await indexedDB.databases?.() || [];
    for (const d of dbs) {
      if (d.name?.includes("webllm") || d.name?.includes("mlc") || d.name?.includes("tvm") || d.name?.includes("model")) {
        residues.push({ type: "IndexedDB", name: d.name });
      }
    }
  } catch {}
  return residues;
}

/** 取消下载并清理所有已下载的缓存 */
export async function cancelAndClear() {
  cancelDownload();
  await new Promise((r) => setTimeout(r, 500));
  await clearModelCache();
}

async function getEngine() {
  if (!engineReady || !engine) return null;
  return engine;
}

/**
 * 向本地模型发送聊天请求。
 */
export async function webllmChat(messages, inference) {
  const eng = await getEngine();
  if (!eng) return null;
  try {
    const reply = await eng.chat.completions.create({
      messages,
      temperature: inference?.temperature ?? 0.7,
      max_tokens: inference?.maxTokens ?? 800,
      top_p: inference?.topP ?? 1.0,
    });
    return reply.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error("WebLLM chat failed:", err);
    return null;
  }
}

/**
 * 流式聊天。
 */
export async function webllmChatStream(messages, inference, onChunk) {
  const eng = await getEngine();
  if (!eng) return null;
  try {
    let full = "";
    const asyncChunkGenerator = await eng.chat.completions.create({
      messages,
      temperature: inference?.temperature ?? 0.7,
      max_tokens: inference?.maxTokens ?? 800,
      top_p: inference?.topP ?? 1.0,
      stream: true,
    });
    for await (const chunk of asyncChunkGenerator) {
      const content = chunk.choices?.[0]?.delta?.content || "";
      if (content) { full += content; onChunk?.(content); }
    }
    return full;
  } catch (err) {
    console.error("WebLLM stream failed:", err);
    return null;
  }
}

/** 获取引擎状态 */
export function getWebLLMStatus() {
  return { ready: engineReady, progress: downloadProgress };
}

/** 卸载引擎释放内存 */
export function unloadWebLLM() {
  if (engine && typeof engine.unload === "function") engine.unload();
  engine = null;
  engineReady = false;
  downloadProgress = 0;
}
