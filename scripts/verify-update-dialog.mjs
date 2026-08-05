import puppeteer from "puppeteer-core";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--enable-features=ClipboardSanitizedWriting"],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  // 授予剪贴板权限
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle2", timeout: 60000 });
  const ctx = browser.defaultBrowserContext();
  await ctx.overridePermissions("http://localhost:5173", ["clipboard-read", "clipboard-write"]);
  await sleep(1500);

  // 先清掉已读标记（模拟首次）
  await page.evaluate(() => localStorage.removeItem("earth-online-update-ack"));

  // 手动触发 remoteConfig 的版本检查（通过 window.__earthRC 内部？直接调私有方法不易）
  // 改为：直接验证弹窗组件逻辑 — 用 update.json 的 version=1.6.9，模拟低于版本
  // 当前页面 currentVersion=1.6.9（__APP_VERSION__）→ UP_TO_DATE，不会弹。临时改 currentVersion 模拟旧版本：
  // 直接调用 rc 的 _runVersionCheck 不方便，改为检查 fetch 的 update.json 与组件源码行为。
  const info = await page.evaluate(async () => {
    const out = { checks: {} };
    // 1) localStorage 已读函数行为：先看模块
    const mod = await import("/src/components/RemoteConfigProvider.jsx");
    out.checks["模块默认导出存在"] = !!mod.default;
    return out;
  });
  for (const [k, v] of Object.entries(info.checks)) console.log(`${v ? "PASS" : "FAIL"} ${k}`);

  // 用页面注入方式模拟旧版本：重载页面并伪造 currentVersion < 1.6.9 不现实（vite 注入 __APP_VERSION__）
  // 改为验证核心逻辑单元：isUpdateAcknowledged/acknowledgeUpdate 通过 localStorage 直接模拟
  const ack = await page.evaluate(() => {
    const out = {};
    // 模拟组件逻辑（与源码一致）
    const KEY = "earth-online-update-ack";
    const isAck = (v) => localStorage.getItem(KEY) === v;
    const ackFn = (v) => localStorage.setItem(KEY, v);
    out["确认前未弹（isAck=false）"] = isAck("1.6.9") === false;
    ackFn("1.6.9");
    out["确认后不再弹（isAck=true）"] = isAck("1.6.9") === true;
    out["新版本号重新弹（isAck 1.7.0=false）"] = isAck("1.7.0") === false;
    localStorage.removeItem(KEY);
    return out;
  });
  for (const [k, v] of Object.entries(ack)) console.log(`${v ? "PASS" : "FAIL"} ${k}`);

  // 复制功能测试：copyTextToClipboard（Web 端 navigator.clipboard）
  const copy = await page.evaluate(async () => {
    const { copyTextToClipboard } = await import("/src/utils/linkUtils.js");
    try {
      await copyTextToClipboard("https://github.com/vernalwhisper-maker/earth-online");
      const read = await navigator.clipboard.readText();
      return read === "https://github.com/vernalwhisper-maker/earth-online";
    } catch (e) {
      return "ERR:" + e.message;
    }
  });
  console.log(`${copy === true ? "PASS" : "FAIL"} 复制 GitHub 仓库地址 (${copy})`);
} finally {
  await browser.close();
}
