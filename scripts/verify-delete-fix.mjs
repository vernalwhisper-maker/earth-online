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
    const out = { checks: {}, errors: [] };
    try {
      const { scanModelCache, deleteModelCache } = await import("/src/utils/webllm.js");
      const { default: useSettingsStore } = await import("/src/store/settingsStore.js");
      const store = useSettingsStore.getState();

      const MID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
      const url = `https://huggingface.co/mlc-ai/${MID}/resolve/main/params_shard_0.bin`;

      // 造数据：三个 scope 各放一个该模型的 key
      for (const sc of ["webllm/model", "webllm/config", "tvmjs"]) {
        const c = await caches.open(sc);
        await c.put(url + (sc === "webllm/config" ? "" : `?${sc}`), new Response("x".repeat(1024), { headers: { "Content-Type": "application/octet-stream" } }));
      }

      // 场景 A：模型已导入（webllmImported=true）→ 该模型缓存算"在用"，不可清理
      await store.setWebllmImported(true);
      await store.setWebllmImportedModel(MID);
      const scanA = await scanModelCache(MID);
      out.checks["A 已导入时 inUse=true（保护在用模型）"] = scanA.some((r) => r.inUse === true);

      // 场景 B：模型已删除（webllmImported=false）→ 残留全部可清理
      await store.setWebllmImported(false);
      await store.setWebllmImportedModel("");
      const scanB = await scanModelCache(MID);
      out.checks["B 删除后 inUse=false（残留可清理）"] = scanB.length > 0 && scanB.every((r) => r.inUse === false);

      // 场景 C：deleteModelCache 应清除 webllm/model + webllm/config + tvmjs 三个 scope 的该模型 key
      const deleted = await deleteModelCache(MID);
      let remain = 0;
      for (const sc of ["webllm/model", "webllm/config", "tvmjs"]) {
        const c = await caches.open(sc);
        remain += (await c.keys()).filter((r) => r.url.includes(`/mlc-ai/${MID}/`)).length;
      }
      out.checks[`C deleteModelCache 删 ${deleted} 条且三 scope 无残留（remain=${remain}）`] = remain === 0 && deleted >= 3;

      // 场景 D：清理后 scan 无残留
      const scanD = await scanModelCache(MID);
      out.checks["D 清理后扫描为空"] = scanD.length === 0;

      // 还原状态
      await store.setWebllmImported(false);
      await store.setWebllmImportedModel("");
    } catch (e) {
      out.errors.push(e?.message || String(e));
    }
    return out;
  });

  console.log("--- 删除/扫描修复验证 ---");
  for (const [k, v] of Object.entries(result.checks)) console.log(`${v ? "PASS" : "FAIL"} ${k}`);
  console.log("errors:", JSON.stringify(result.errors));

  const fails = Object.values(result.checks).filter((v) => !v).length;
  process.exitCode = fails > 0 || result.errors.length > 0 ? 1 : 0;
} finally {
  await browser.close();
}
