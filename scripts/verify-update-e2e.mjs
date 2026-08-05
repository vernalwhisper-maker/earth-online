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
  const ctx = browser.defaultBrowserContext();
  await ctx.overridePermissions("http://localhost:5174", ["clipboard-read", "clipboard-write"]);
  await page.goto("http://localhost:5174/", { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(6000); // 等 rc 拉取 + 版本检查

  const findBtn = async (label) => {
    return await page.evaluate((t) => {
      const els = [...document.querySelectorAll("button")];
      const el = els.find((n) => n.textContent.trim() === t && n.offsetParent !== null);
      if (!el) return false;
      el.click();
      return true;
    }, label);
  };

  // 1) 弹窗出现 + 文案
  const dlg = await page.evaluate(() => {
    const h = [...document.querySelectorAll("h3")].find((n) => n.offsetParent !== null);
    const p = [...document.querySelectorAll("p")].find((n) => n.textContent.includes("最新版本") && n.offsetParent !== null);
    const btns = [...document.querySelectorAll("button")].filter((n) => n.offsetParent !== null && (n.textContent.trim() === "确认" || n.textContent.trim() === "立即更新"));
    return { title: h?.textContent.trim() || null, msg: p?.textContent.trim() || null, btnCount: btns.length, btnLabels: btns.map((b) => b.textContent.trim()) };
  });
  console.log(`${dlg.title === "发现新版本" && dlg.msg?.includes("最新版本 1.6.9") ? "PASS" : "FAIL"} 弹窗文案: ${JSON.stringify(dlg)}`);
  console.log(`${dlg.btnCount === 2 && dlg.btnLabels.includes("确认") && dlg.btnLabels.includes("立即更新") ? "PASS" : "FAIL"} 两按钮: ${JSON.stringify(dlg.btnLabels)}`);

  // 2) 点「确认」→ 关闭
  await findBtn("确认");
  await sleep(800);
  const closed = await page.evaluate(() => {
    const p = [...document.querySelectorAll("p")].find((n) => n.textContent.includes("最新版本") && n.offsetParent !== null);
    return !p;
  });
  console.log(`${closed ? "PASS" : "FAIL"} 点确认后弹窗关闭`);

  // 3) 重载 → 不再弹（已确认）
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(6000);
  const afterReload = await page.evaluate(() => {
    const p = [...document.querySelectorAll("p")].find((n) => n.textContent.includes("最新版本") && n.offsetParent !== null);
    return !p;
  });
  console.log(`${afterReload ? "PASS" : "FAIL"} 确认后重载不再弹`);
  const ackVal = await page.evaluate(() => localStorage.getItem("earth-online-update-ack"));
  console.log(`${ackVal === "1.6.9" ? "PASS" : "FAIL"} 已读标记写入 (${ackVal})`);

  // 4) 清标记 → 重载 → 再弹 → 点「立即更新」→ 剪贴板 + toast
  await page.evaluate(() => localStorage.removeItem("earth-online-update-ack"));
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(6000);
  const shown2 = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")].filter((n) => n.offsetParent !== null && n.textContent.trim() === "立即更新");
    return btns.length > 0;
  });
  console.log(`${shown2 ? "PASS" : "FAIL"} 清标记后重新弹出`);
  await findBtn("立即更新");
  await sleep(1200);
  const clip = await page.evaluate(async () => {
    try {
      const t = await navigator.clipboard.readText();
      return t;
    } catch { return "ERR"; }
  });
  console.log(`${clip === "https://github.com/vernalwhisper-maker/earth-online" ? "PASS" : "FAIL"} 立即更新复制仓库地址 (${clip})`);
  const toast = await page.evaluate(() => {
    const els = [...document.querySelectorAll("div,span,p")];
    const t = els.find((n) => n.textContent.includes("已复制 GitHub 仓库地址") && n.offsetParent !== null);
    return !!t;
  });
  console.log(`${toast ? "PASS" : "FAIL"} 复制后弹出提醒 toast`);
  const closed2 = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")].filter((n) => n.offsetParent !== null && n.textContent.trim() === "立即更新");
    return btns.length === 0;
  });
  console.log(`${closed2 ? "PASS" : "FAIL"} 立即更新后弹窗关闭`);
} finally {
  await browser.close();
}
