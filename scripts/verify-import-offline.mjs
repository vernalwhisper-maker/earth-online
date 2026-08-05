import puppeteer from "puppeteer-core";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(1500);

  const result = await page.evaluate(async () => {
    const out = { errors: [] };
    try {
      const fflate = await import("/node_modules/.vite/deps/fflate.js");
      const { importModelFromZip } = await import("/src/utils/webllm.js");
      const { getModelSourceUrl } = await import("/src/utils/webllm.js");
      const enc = new TextEncoder();
      const files = {
        "mlc-chat-config.json": enc.encode(JSON.stringify({
          model_config: { hidden_size: 1536, num_hidden_layers: 28 },
          tokenizer_files: ["tokenizer.json"],
        })),
        "tokenizer.json": enc.encode(JSON.stringify({} )),
        "tensor-cache.json": enc.encode(JSON.stringify({ records: [] })),
        "ndarray-cache.json": enc.encode(JSON.stringify({})),
        "params_shard_0.bin": enc.encode("fake-shard-data"),
      };
      const zipBuf = fflate.zipSync(files);

      const file = new File([zipBuf], "model.zip", { type: "application/zip" });
      const imp = await importModelFromZip(file, "Qwen2.5-1.5B-Instruct-q4f16_1-MLC");
      out.import = imp;

      // 检查各 scope 的 key
      const scopes = ["webllm/model", "webllm/config", "tvmjs"];
      out.cache = {};
      for (const sc of scopes) {
        const c = await caches.open(sc);
        const keys = (await c.keys()).map((r) => r.url);
        out.cache[sc] = keys;
      }
      const has = (arr, frag) => arr.some((u) => u.includes(frag));

      const modelScope = out.cache["webllm/model"] || [];
      const configScope = out.cache["webllm/config"] || [];
      const tvmjsScope = out.cache["tvmjs"] || [];

      out.checks = {
        "权重写入 webllm/model": has(modelScope, "params_shard_0.bin") && !has(tvmjsScope, "params_shard_0.bin"),
        "tokenizer 写入 webllm/model": has(modelScope, "tokenizer.json") && !has(configScope, "tokenizer.json"),
        "tensor-cache 写入 webllm/model": has(modelScope, "tensor-cache.json"),
        "mlc-chat-config 写入 webllm/config": has(configScope, "mlc-chat-config.json") && !has(modelScope, "mlc-chat-config.json"),
        "hf 前缀命中": has(modelScope, "huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/resolve/main"),
        "mirror 前缀命中": has(modelScope, "hf-mirror.com/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/resolve/main"),
      };

      // 用 web-llm 官方 hasModelInCache 验证缓存命中
      const webllm = await import("/node_modules/.vite/deps/@mlc-ai_web-llm.js");
      const appConfig = {
        model_list: [{
          model_id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
          model: getModelSourceUrl("Qwen2.5-1.5B-Instruct-q4f16_1-MLC"),
          model_lib: "/webllm/wasm/Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm",
        }],
      };
      out.hasModelInCache = await webllm.hasModelInCache("Qwen2.5-1.5B-Instruct-q4f16_1-MLC", appConfig);
      out.checks["web-llm hasModelInCache=true"] = out.hasModelInCache === true;
    } catch (e) {
      out.errors.push(e?.message || String(e));
    }
    return out;
  });

  console.log("导入结果:", JSON.stringify(result.import));
  console.log("--- 缓存检查 ---");
  for (const [k, v] of Object.entries(result.checks)) console.log(`${v ? "PASS" : "FAIL"} ${k}`);
  console.log("hasModelInCache:", result.hasModelInCache);
  console.log("errors:", JSON.stringify(result.errors));

  const fails = Object.values(result.checks).filter((v) => !v).length;
  process.exitCode = fails > 0 || result.errors.length > 0 ? 1 : 0;
} finally {
  await browser.close();
}
