// WebLLM 本地模型引擎封装
// 在浏览器内通过 WebGPU 运行 LLM，无需服务器
// 使用动态 import() 避免将 ~6MB 库打包到主 JS 中

import useSettingsStore from "../store/settingsStore";

let engine = null;
let engineReady = false;
/** 当前引擎加载的模型 ID（切换模型时用于判断是否需要重新初始化） */
let loadedModelId = null;
let downloadProgress = 0;
let webllmModule = null;
let cancelRequested = false;
/** 取消竞速器：cancelDownload() 时 reject，使 initWebLLM 立即返回（不依赖库回调异常） */
let cancelDeferred = null;
/** 最近一次初始化/使用的错误信息（供 UI 展示定位问题） */
let lastError = null;

/** 获取最近一次 WebLLM 错误信息 */
export function getLastError() {
  return lastError;
}

/** 统计 WebLLM 相关 Cache Storage 缓存条目（诊断用） */
export async function getWebLLMCacheStats() {
  const stats = {};
  try {
    for (const scope of ["tvmjs", "webllm/config", "webllm/wasm"]) {
      try {
        const cache = await caches.open(scope);
        const keys = await cache.keys();
        stats[scope] = { count: keys.length, sample: keys.slice(0, 2).map((r) => r.url) };
      } catch {
        stats[scope] = { count: 0, error: true };
      }
    }
  } catch (err) {
    stats.error = err?.message;
  }
  return stats;
}

/** 默认模型（settingsStore 未配置时） */
const DEFAULT_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

/** 已知模型的 wasm 运行时库文件名（与 web-llm prebuiltAppConfig 一致） */
const WASM_FILES = {
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC": "Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm",
  "Qwen2.5-3B-Instruct-q4f16_1-MLC": "Qwen2.5-3B-Instruct-q4f16_1_cs1k-webgpu.wasm",
};

/**
 * 已知模型特征（用于从 zip 内容自动识别模型）：
 * 依据 mlc-chat-config.json 的 model_config（hidden_size / num_hidden_layers）与分片数量。
 */
const MODEL_FEATURES = [
  { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", hiddenSize: 1536, layers: 28, shards: 30 },
  { id: "Qwen2.5-3B-Instruct-q4f16_1-MLC", hiddenSize: 2048, layers: 36, shards: 62 },
];

/**
 * 从已解压的 zip 文件内容中自动识别模型 ID。
 * @param {Object} files - unzipSync 输出 { 文件名: Uint8Array }
 * @returns {string|null} 匹配的 modelId；无法识别返回 null
 */
export function detectModelFromZip(files) {
  try {
    const cfgRaw = files["mlc-chat-config.json"];
    if (!cfgRaw) return null;
    const cfg = JSON.parse(new TextDecoder().decode(cfgRaw));
    const mc = cfg.model_config || {};
    const hiddenSize = mc.hidden_size;
    const layers = mc.num_hidden_layers;
    const shardCount = Object.keys(files).filter((n) => /^params_shard_\d+\.bin$/.test(n)).length;
    for (const f of MODEL_FEATURES) {
      if ((hiddenSize === undefined || f.hiddenSize === hiddenSize)
        && (layers === undefined || f.layers === layers)
        && (shardCount === 0 || f.shards === shardCount)) {
        return f.id;
      }
    }
  } catch {
    // 识别失败返回 null
  }
  return null;
}

/**
 * 构建 wasm 运行时库 URL（model_lib）。
 * wasm 随应用分发（public/webllm/wasm/，构建后进入 APK/PWA 资源），
 * 使用同源绝对路径加载——不依赖任何网络/镜像，离线环境始终可用。
 * （web-llm 对非 http URL 走同源 fetch 分支，直接加载应用自带文件）
 */
export function getModelLibUrl(modelId) {
  const id = modelId || DEFAULT_MODEL;
  const wasmName = WASM_FILES[id] || `${id.replace(/-MLC$/, "")}_q4f16_1_0_2_84.wasm`;
  return `/webllm/wasm/${wasmName}`;
}

/**
 * 根据设置页「下载源」构建模型权重目录 URL（以 /resolve/main/ 结尾）。
 * web-llm 的 cleanModelUrl 要求 URL 以 /resolve/<branch>/ 结尾，否则会强制追加 resolve/main/。
 */
export function getModelSourceUrl(modelId) {
  const s = useSettingsStore.getState ? useSettingsStore.getState() : {};
  const id = modelId || DEFAULT_MODEL;
  if (s.webllmSource === "mirror") {
    return `https://hf-mirror.com/mlc-ai/${id}/resolve/main/`;
  }
  if (s.webllmSource === "custom" && s.webllmCustomUrl && s.webllmCustomUrl.trim()) {
    let u = s.webllmCustomUrl.trim();
    if (!u.endsWith("/")) u += "/";
    return u;
  }
  return `https://huggingface.co/mlc-ai/${id}/resolve/main/`;
}

/**
 * 初始化 WebLLM 引擎。首次会自动下载模型到浏览器缓存。
 * 下载源由设置页配置：HuggingFace 国际源 / hf-mirror 国内镜像 / 自定义 URL / 本地导入缓存。
 * @param {string} modelId - 模型 ID
 * @param {function} onProgress - 下载进度回调 (progress: 0-100, text: string)
 * @param {function} onCancel - 检查是否取消的函数 () => boolean（兼容旧调用）
 * @returns {Promise<boolean>}
 */
export async function initWebLLM(modelId, onProgress, onCancel) {
  // 引擎已就绪且模型一致 → 直接复用（避免切换模型后仍用旧引擎）
  if (engineReady && loadedModelId === modelId) return true;
  // 引擎已就绪但模型不同（或残留未清理）→ 先卸载旧引擎
  if (engine) unloadWebLLM();

  cancelRequested = false;
  cancelDeferred = null;
  let rejectFn = null;
  const cancelPromise = new Promise((_, reject) => { rejectFn = reject; });
  cancelDeferred = { reject: rejectFn };

  try {
    downloadProgress = 0;
    if (!webllmModule) {
      webllmModule = await import("@mlc-ai/web-llm");
    }
    const createPromise = webllmModule.CreateMLCEngine(
      modelId || DEFAULT_MODEL,
      {
        // 指定模型权重目录与 wasm 运行时库（下载源：国际/镜像/自定义；镜像时 wasm 走 jsDelivr 免 VPN）
        appConfig: {
          model_list: [
            {
              model_id: modelId || DEFAULT_MODEL,
              model: getModelSourceUrl(modelId),
              model_lib: getModelLibUrl(modelId),
            },
          ],
        },
        initProgressCallback: (report) => {
          // 取消时不 throw（库可能吞掉回调异常导致 promise 永不 settle），
          // 仅停止更新进度；取消由下方 Promise.race 立即接管
          if (cancelRequested) return;
          const pct = Math.round(report.progress * 100);
          downloadProgress = pct;
          onProgress?.(pct, report.text);
        },
      }
    ).then((eng) => {
      // 引擎创建完成但期间已被取消 → 立即卸载，避免残留引擎占用内存
      if (cancelRequested) {
        try { eng?.unload?.(); } catch {}
        return null;
      }
      return eng;
    });

    engine = await Promise.race([createPromise, cancelPromise]);
    if (!engine) {
      engineReady = false;
      return false;
    }
    loadedModelId = modelId;
    engineReady = true;
    return true;
  } catch (err) {
    if (err?.message === "Download cancelled by user") {
      console.log("WebLLM download cancelled");
    } else {
      console.error("WebLLM init failed:", err);
      lastError = (err?.message || String(err)) + `（模型源: ${getModelSourceUrl(modelId || DEFAULT_MODEL)}）`;
    }
    engineReady = false;
    return false;
  } finally {
    cancelDeferred = null;
  }
}

/** 请求取消下载（立即 reject 竞速器，使 initWebLLM 快速返回） */
export function cancelDownload() {
  cancelRequested = true;
  cancelDeferred?.reject(new Error("Download cancelled by user"));
}

/** 查询最近一次下载是否被用户取消（供 UI 区分「已取消」与「失败」） */
export function wasCancelled() {
  return cancelRequested;
}

/**
 * 彻底删除指定模型的本地缓存（按模型 URL 前缀精确删除，不影响其他已导入模型）。
 * 清理 tvmjs（权重）与 webllm/config（配置）中属于该模型的条目，并重置引擎状态。
 * @returns {Promise<number>} 删除的缓存条目数
 */
export async function deleteModelCache(modelId) {
  const id = modelId || DEFAULT_MODEL;
  const marker = `/mlc-ai/${id}/`;
  let deleted = 0;
  for (const scope of ["tvmjs", "webllm/config"]) {
    try {
      const cache = await caches.open(scope);
      const keys = await cache.keys();
      const toDelete = keys.filter((r) => r.url.includes(marker));
      await Promise.all(toDelete.map((r) => cache.delete(r)));
      deleted += toDelete.length;
    } catch (err) {
      console.warn("deleteModelCache scope:", scope, err);
    }
  }
  unloadWebLLM();
  return deleted;
}

/**
 * 从 zip 导入模型到浏览器缓存（离线可用，无需 VPN 下载）。
 *
 * 规范：zip 内所有文件必须直接位于根目录（mlc-chat-config.json / ndarray-cache.json /
 * params_shard_*.bin / tokenizer 等），不要套外层文件夹。
 *
 * 实现：解压后按 web-llm 的加载 scope 写入 Cache Storage（tvmjs / webllm/config / webllm/wasm），
 * 缓存键 = 当前下载源的模型 URL + 相对路径，与 web-llm 运行时请求完全一致
 * （web-llm 的 fetchWithCache 命中缓存即不再发起网络请求）。
 *
 * @param {File} file - 模型 zip 文件
 * @param {string} modelId - 模型 ID（决定写入哪个模型 URL 前缀下）
 * @param {function} onProgress - ({ phase, pct, file }) => void
 * @returns {Promise<{ok:boolean, files?:number, bytes?:number, message?:string}>}
 */
export async function importModelFromZip(file, modelId, onProgress) {
  let unzipSync;
  try {
    ({ unzipSync } = await import("fflate"));
  } catch (err) {
    return { ok: false, message: "解压库加载失败：" + (err?.message || "") };
  }

  onProgress?.({ phase: "读取压缩包", pct: 0, file: "" });
  let buf;
  try {
    buf = new Uint8Array(await file.arrayBuffer());
  } catch (err) {
    return { ok: false, message: "读取 zip 失败：" + (err?.message || "") };
  }

  onProgress?.({ phase: "解压中", pct: 0, file: "" });
  let files;
  try {
    files = unzipSync(buf);
  } catch (err) {
    return { ok: false, message: "zip 解压失败（文件可能损坏或不是 zip）：" + (err?.message || "") };
  }

  const entries = Object.entries(files).filter(([name]) => !name.endsWith("/"));
  if (entries.length === 0) return { ok: false, message: "zip 内没有文件" };
  if (!files["mlc-chat-config.json"]) {
    return { ok: false, message: "zip 内缺少 mlc-chat-config.json（请确认文件在 zip 根目录，未套外层文件夹）" };
  }

  // 自动识别模型（依据 mlc-chat-config 特征）；识别不出时用当前选中模型
  const detectedModelId = detectModelFromZip(files);
  const id = detectedModelId || modelId;

  // 同时写入 hf 与 hf-mirror 两个 URL 前缀的缓存：
  // 无论运行时下载源选「国际源」还是「国内镜像」，都能命中离线缓存（避免切换源导致缓存失效）
  const urlPrefixes = [...new Set([
    `https://huggingface.co/mlc-ai/${id}/resolve/main/`,
    `https://hf-mirror.com/mlc-ai/${id}/resolve/main/`,
  ])];

  const totalBytes = entries.reduce((sum, [, d]) => sum + (d?.length || 0), 0);
  let doneBytes = 0;
  let written = 0;

  for (const [name, data] of entries) {
    const cacheName = getWebLLMCacheScope(name);
    if (!cacheName) continue; // 未知文件（如 README.md/.wasm 等）跳过
    try {
      const cache = await caches.open(cacheName);
      for (const prefix of urlPrefixes) {
        const url = new URL(name, prefix).href;
        await cache.put(url, new Response(data, { headers: { "Content-Type": "application/octet-stream" } }));
      }
      written++;
    } catch (err) {
      console.warn("写入缓存失败:", name, err);
    }
    doneBytes += data?.length || 0;
    onProgress?.({ phase: "写入缓存", pct: Math.round((doneBytes / totalBytes) * 100), file: name });
  }

  if (written === 0) return { ok: false, message: "zip 内没有可识别的模型文件" };
  return { ok: true, files: written, bytes: totalBytes, detectedModelId };
}

/**
 * 根据文件名决定写入哪个 Cache Storage scope（与 web-llm 加载时使用的 scope 一致）：
 * - tvmjs：权重分片 params_shard_*.bin + ndarray-cache.json + tensor-cache.json
 * - webllm/config：mlc-chat-config.json + tokenizer/vocab/merges
 * （wasm 运行时库已随应用自带，无需导入）
 */
function getWebLLMCacheScope(name) {
  const base = (name.split("/").pop() || name).toLowerCase();
  if (/^params_shard_.*\.bin$/.test(base) || base === "ndarray-cache.json" || base === "tensor-cache.json") return "tvmjs";
  if (/^mlc-chat-config\.json$/.test(base) || /^tokenizer/.test(base) || base === "vocab.json" || base === "merges.txt") return "webllm/config";
  return null;
}

/** WebLLM 使用的 Cache Storage scope 清单（清理/扫描只针对这些，避免误删 PWA 等其他缓存） */
const WEBLLM_CACHE_SCOPES = ["tvmjs", "webllm/config", "webllm/wasm"];

/** 彻底清除所有 WebLLM 缓存（全部模型 + wasm），并重置内存引擎状态 */
export async function clearModelCache(modelId) {
  try {
    // 0. 使用 WebLLM 内置清理函数
    try {
      const mod = await import("@mlc-ai/web-llm");
      if (mod.deleteModelAllInfoInCache) await mod.deleteModelAllInfoInCache(modelId || "");
    } catch {}

    // 1. 只清理 WebLLM 专用的 Cache Storage scope（不误删 PWA 等其他缓存）
    await Promise.all(
      WEBLLM_CACHE_SCOPES.map((scope) => caches.delete(scope).catch(() => false))
    );
    // 2. 清理 WebLLM 相关的 IndexedDB
    const dbs = await indexedDB.databases?.() || [];
    await Promise.all(
      dbs
        .filter((d) => d.name?.includes("webllm") || d.name?.includes("mlc") || d.name?.includes("tvm"))
        .map((d) => indexedDB.deleteDatabase(d.name).catch(() => {}))
    );
  } catch (err) {
    console.warn("clearModelCache:", err);
  }
  // 3. 重置内存引擎状态：避免删除模型后 engineReady 仍为 true 造成「假已下载」
  unloadWebLLM();
}

/** 扫描 WebLLM 缓存（区分「在用模型」与「残留」：在用的缓存不可清理，避免误删已导入模型） */
export async function scanModelCache(modelId) {
  const s = useSettingsStore.getState ? useSettingsStore.getState() : {};
  // 当前在用/已导入的模型 ID（其缓存属于正常数据，不算残留）
  const inUseId = s.webllmImportedModel || modelId || DEFAULT_MODEL;
  const residues = [];
  try {
    // 只统计 WebLLM 专用 Cache Storage scope
    for (const scope of WEBLLM_CACHE_SCOPES) {
      try {
        const cache = await caches.open(scope);
        const requests = await cache.keys();
        if (requests.length === 0) continue;
        let totalSize = 0;
        for (const req of requests) {
          try { const r = await cache.match(req); if (r) totalSize += (await r.blob()).size; } catch {}
        }
        const sizeLabel = totalSize > 1048576 ? (totalSize / 1048576).toFixed(1) + "MB" : (totalSize / 1024).toFixed(1) + "KB";
        const inUse = requests.some((r) => r.url.includes(`/mlc-ai/${inUseId}/`));
        residues.push({ type: "Cache Storage", name: scope, size: requests.length + "项 / " + sizeLabel, inUse });
      } catch {}
    }
    // IndexedDB
    const dbs = await indexedDB.databases?.() || [];
    for (const d of dbs) {
      if (d.name?.includes("webllm") || d.name?.includes("mlc") || d.name?.includes("tvm")) {
        residues.push({ type: "IndexedDB", name: d.name, size: "", inUse: true });
      }
    }
  } catch {}
  return residues;
}

/** 取消下载并清理所有已下载的缓存 */
export async function cancelAndClear() {
  cancelDownload();
  // 等待竞速器触发 initWebLLM 返回，再清理缓存
  await new Promise((r) => setTimeout(r, 800));
  await clearModelCache();
}

/** 确保引擎就绪：未就绪时用设置中的模型与下载源自动初始化（离线缓存命中则不联网）。可传进度回调。 */
export async function ensureEngine(onProgress) {
  if (engineReady) return true;
  const s = useSettingsStore.getState ? useSettingsStore.getState() : {};
  return initWebLLM(s.webllmModel || DEFAULT_MODEL, onProgress);
}

async function getEngine() {
  if (!engineReady || !engine) return null;
  return engine;
}

/**
 * 向本地模型发送聊天请求。
 * 引擎未就绪时自动初始化（使用设置中的模型与下载源；离线缓存命中则不联网）。
 * 失败时抛出带具体原因的错误（供 UI 展示）。
 */
export async function webllmChat(messages, inference) {
  let eng = await getEngine();
  if (!eng) {
    const ok = await ensureEngine();
    if (!ok) throw new Error(getLastError() || "WebLLM 引擎初始化失败");
    eng = await getEngine();
    if (!eng) throw new Error("WebLLM 引擎未就绪");
  }
  try {
    const reply = await eng.chat.completions.create({
      messages,
      temperature: inference?.temperature ?? 0.7,
      max_tokens: inference?.maxTokens ?? 800,
      top_p: inference?.topP ?? 1.0,
    });
    return reply.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("WebLLM chat failed:", err);
    lastError = err?.message || String(err);
    throw new Error("WebLLM 对话失败：" + (err?.message || ""));
  }
}

/**
 * 流式聊天。
 */
export async function webllmChatStream(messages, inference, onChunk) {
  let eng = await getEngine();
  if (!eng) {
    const ok = await ensureEngine();
    if (!ok) throw new Error(getLastError() || "WebLLM 引擎初始化失败");
    eng = await getEngine();
    if (!eng) throw new Error("WebLLM 引擎未就绪");
  }
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
    lastError = err?.message || String(err);
    throw new Error("WebLLM 对话失败：" + (err?.message || ""));
  }
}

/** 获取引擎状态 */
export function getWebLLMStatus() {
  return { ready: engineReady, progress: downloadProgress };
}

/** 卸载引擎释放内存，并重置全部内存状态（含已加载模型 ID 与取消标记） */
export function unloadWebLLM() {
  if (engine && typeof engine.unload === "function") engine.unload();
  engine = null;
  engineReady = false;
  loadedModelId = null;
  cancelRequested = false;
  downloadProgress = 0;
}
