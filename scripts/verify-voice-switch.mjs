import puppeteer from "puppeteer-core";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (el) => el.evaluate((n) => n.textContent);

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

  // 1) 默认开关值
  const def = await page.evaluate(async () => {
    const { default: s } = await import("/src/store/settingsStore.js");
    return s.getState().voiceRecognitionEnabled;
  });
  console.log(`${def === false ? "PASS" : "FAIL"} 默认 voiceRecognitionEnabled=false (实际: ${def})`);

  // 2) 进入更多设置页（设置 tab → 更多设置）
  const clickByText = async (t) => {
    const clicked = await page.evaluate((target) => {
      const els = [...document.querySelectorAll("button, [role=button], span, p, div")];
      const el = els.find((n) => n.textContent.trim() === target && n.offsetParent !== null);
      if (!el) return false;
      el.click();
      return true;
    }, t);
    await sleep(600);
    return clicked;
  };
  await clickByText("设置");
  await sleep(500);
  // 首次使用引导弹窗 → 点"同意并继续"
  await page.evaluate(() => {
    const els = [...document.querySelectorAll("button")];
    const el = els.find((n) => n.textContent.includes("同意并继续") && n.offsetParent !== null);
    if (el) el.click();
  });
  await sleep(500);
  const moreEntry = await page.evaluate(() => {
    const els = [...document.querySelectorAll("button, div, span")];
    const el = els.find((n) => n.textContent.includes("更多设置") && n.offsetParent !== null && n.textContent.length < 40);
    if (!el) return false;
    el.click();
    return true;
  });
  await sleep(600);
  console.log(`${moreEntry ? "PASS" : "FAIL"} 进入更多设置页`);

  // 3) 找到"开启语音识别"开关并点击 → 弹窗
  const switchInfo = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("p")].filter((n) => n.textContent.includes("开启语音识别") && n.offsetParent !== null);
    if (rows.length === 0) return { found: false };
    const row = rows[0].closest("div.flex.items-center.justify-between");
    const sw = row?.querySelector("[role=switch]");
    if (!sw) return { found: true, hasSwitch: false };
    const before = sw.getAttribute("aria-checked");
    sw.click();
    return { found: true, hasSwitch: true, before };
  });
  await sleep(600);
  console.log(`${switchInfo.found && switchInfo.hasSwitch ? "PASS" : "FAIL"} 找到语音开关 (found=${switchInfo.found}, switch=${switchInfo.hasSwitch})`);

  const modal = await page.evaluate(() => {
    const els = [...document.querySelectorAll("h3, p")];
    const h = els.find((n) => n.textContent.includes("语音识别暂不可用") && n.offsetParent !== null);
    return h ? h.textContent.trim() : null;
  });
  console.log(`${modal ? "PASS" : "FAIL"} 点击开关弹出提示弹窗 (${modal})`);

  // 4) 关闭弹窗后开关仍为关闭
  const after = await page.evaluate(async () => {
    const { default: s } = await import("/src/store/settingsStore.js");
    return s.getState().voiceRecognitionEnabled;
  });
  console.log(`${after === false ? "PASS" : "FAIL"} 弹窗后开关仍为关闭 (实际: ${after})`);
} finally {
  await browser.close();
}
