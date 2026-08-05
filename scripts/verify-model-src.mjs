import puppeteer from "puppeteer-core";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=430,900"],
    defaultViewport: { width: 430, height: 900 },
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(2000);

  // 浏览器内（真实同源策略 + 系统网络）测试各模型源
  const targets = [
    "https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/resolve/main/config.json",
    "https://hf-mirror.com/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/resolve/main/config.json",
    "https://cdn.jsdelivr.net/gh/vernalwhisper-maker/earth-online@main/public/update.json",
  ];
  const out = [];
  for (const u of targets) {
    try {
      const res = await page.evaluate(async (url) => {
        const ctl = new AbortController();
        setTimeout(() => ctl.abort(), 10000);
        try {
          const r = await fetch(url, { signal: ctl.signal });
          return { status: r.status, ok: r.ok, acao: r.headers.get("access-control-allow-origin") };
        } catch (e) {
          return { error: e.name + ": " + e.message.slice(0, 60) };
        }
      }, u);
      out.push({ url: u.replace("mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/resolve/main/", ".../"), result: res });
    } catch (e) {
      out.push({ url: u, result: { error: "eval fail" } });
    }
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
