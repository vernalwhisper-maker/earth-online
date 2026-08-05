/**
 * TOTP 动态密码校验（RFC 6238，HMAC-SHA1，6 位，30 秒步长）。
 * 用于高级调试入口（成就调试）的访问保护。
 * 密钥由 scripts/gen-totp.mjs 生成，放入用户 Authenticator 后即可获取动态密码。
 * 密钥不再硬编码：由远程配置（update.json 签名下发）在 App 启动时写入本地存储，
 * 换密钥只需更新远程配置，无需重新打包。
 * 依赖 Web Crypto API（crypto.subtle），需在 secure context（https / localhost / Capacitor WebView）下运行。
 */

// 本地存储中的 TOTP 密钥（由 RemoteConfigProvider 从签名配置写入）
const TOTP_SECRET_STORAGE_KEY = "earth-online-totp-secret";

/** 读取当前生效的 TOTP 密钥（无则返回 null） */
export function getTotpSecret() {
  try { return localStorage.getItem(TOTP_SECRET_STORAGE_KEY) || null; } catch { return null; }
}

/** 更新 TOTP 密钥（仅在远程配置签名校验通过后由 RemoteConfigProvider 调用） */
export function setTotpSecret(secret) {
  if (!secret) return;
  try {
    if (localStorage.getItem(TOTP_SECRET_STORAGE_KEY) !== secret) {
      localStorage.setItem(TOTP_SECRET_STORAGE_KEY, secret);
    }
  } catch {}
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(str) {
  const clean = str.replace(/=+$/g, "").toUpperCase();
  let bits = "";
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) return null;
    bits += idx.toString(2).padStart(5, "0");
  }
  const out = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return out;
}

/** 计算某个时间步（秒）对应的 6 位动态密码 */
async function totpAt(timeStepSec) {
  const secret = getTotpSecret();
  if (!secret) return null;
  const keyBytes = base32Decode(secret);
  if (!keyBytes) return null;
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(4, Math.floor(timeStepSec / 30), false); // 大端
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msg);
  const h = new Uint8Array(sig);
  const offset = h[h.length - 1] & 0x0f;
  const bin = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(bin % 1000000).padStart(6, "0");
}

/**
 * 校验 6 位动态密码（允许 ±1 个时间步 = ±30s 容差）。
 * @param {string|number} code
 * @returns {Promise<boolean>}
 */
export async function verifyTotp(code) {
  const input = String(code).trim();
  if (!/^\d{6}$/.test(input)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  for (let w = -1; w <= 1; w++) {
    const expected = await totpAt(nowSec + w * 30);
    if (expected === input) return true;
  }
  return false;
}
