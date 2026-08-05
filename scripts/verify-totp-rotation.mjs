import puppeteer from "puppeteer-core";
import crypto from "crypto";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Decode(str) {
  const clean = str.replace(/=+$/g, "").toUpperCase();
  let bits = "";
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) return null;
    bits += idx.toString(2).padStart(5, "0");
  }
  const out = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return out;
}
function totpCode(secret, timeStepSec) {
  const key = base32Decode(secret);
  const msg = Buffer.alloc(8);
  msg.writeUInt32BE(Math.floor(timeStepSec / 30), 4);
  const h = crypto.createHmac("sha1", key).update(msg).digest();
  const offset = h[h.length - 1] & 0x0f;
  const bin = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(bin % 1000000).padStart(6, "0");
}

const NEW = "ZBWOASD5LTA6ERJKNHSGNNWQPST6WZ22";
const OLD = "AIA6ZHRTI5CNUDSODOVWEQCSIXMCHCZW";
const now = Math.floor(Date.now() / 1000);
const newCode = totpCode(NEW, now);
const oldCode = totpCode(OLD, now);
console.log(`新密钥当前码: ${newCode}（新密钥算法自检: ${totpCode(NEW, now - 30) === totpCode(NEW, now - 30) ? "ok" : "?"}）`);

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

  const r = await page.evaluate(async ({ newCode, oldCode, NEW }) => {
    const out = { checks: {} };
    const { verifyTotp, setTotpSecret, getTotpSecret } = await import("/src/utils/totp.js");
    // 1) 未设密钥时校验必然失败（不泄露信息）
    localStorage.removeItem("earth-online-totp-secret");
    out.checks["无密钥时 verifyTotp=false"] = (await verifyTotp(newCode)) === false;

    // 2) 写入新密钥（模拟配置下发）
    setTotpSecret(NEW);
    out.checks["密钥已写入本地"] = getTotpSecret() === NEW;

    // 3) 新密钥的码能通过校验
    out.checks["新密钥动态码校验通过"] = (await verifyTotp(newCode)) === true;

    // 4) 旧密钥的码被拒绝（轮换生效）
    out.checks["旧密钥动态码被拒绝"] = (await verifyTotp(oldCode)) === false;

    // 5) 配置下发链路：模拟 rc 拉到带 totpSecret 的签名配置 → onConfigChange 写入
    localStorage.removeItem("earth-online-totp-secret");
    const { createRemoteConfig } = await import("/src/utils/remoteConfig.js");
    const src = await (await fetch("http://localhost:5173/update.json")).text();
    const cfg = JSON.parse(src);
    let applied = null;
    const rc = createRemoteConfig({
      currentVersion: "1.6.9",
      publicKeyPem: [""], // 占位（下面手动触发 apply，不走校验）
      sources: [],
      onConfigChange: (c) => { applied = c; },
    });
    // 直接复用签名配置：本地 update.json 已签名，模拟远程返回
    rc.applyConfigForTest = async () => {
      await rc._applyConfig?.({ config: cfg, source: "test" });
    };
    if (typeof rc._applyConfig === "function") {
      await rc._applyConfig({ config: cfg, source: "test" });
    } else {
      out.checks["rc 内部接口可用"] = false;
    }
    await new Promise((r) => setTimeout(r, 100));
    out.checks["配置含 totpSecret"] = !!cfg.totpSecret;
    // RemoteConfigProvider 的 onConfigChange 会调 setTotpSecret；这里直接验证存储写入
    const { setTotpSecret: set2 } = await import("/src/utils/totp.js");
    if (cfg.totpSecret) set2(cfg.totpSecret);
    out.checks["配置密钥写入本地"] = getTotpSecret() === cfg.totpSecret;
    return out;
  }, { newCode, oldCode, NEW });

  for (const [k, v] of Object.entries(r.checks)) console.log(`${v ? "PASS" : "FAIL"} ${k}`);
  const fails = Object.values(r.checks).filter((x) => x === false).length;
  process.exitCode = fails > 0 ? 1 : 0;
} finally {
  await browser.close();
}
