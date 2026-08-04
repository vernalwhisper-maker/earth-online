// 生成 TOTP 密钥并验证（RFC 6238）
// 用法：node scripts/gen-totp.mjs
import { randomBytes, createHmac } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes) {
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  while (out.length % 8 !== 0) out += "=";
  return out;
}

function base32Decode(str) {
  const clean = str.replace(/=+$/g, "").toUpperCase();
  let bits = "";
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("invalid base32 char: " + ch);
    bits += idx.toString(2).padStart(5, "0");
  }
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    out.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(out);
}

function totpAt(secretBase32, timeStepSec) {
  const key = base32Decode(secretBase32);
  const msg = Buffer.alloc(8);
  msg.writeUInt32BE(Math.floor(timeStepSec / 30), 4);
  const hmac = createHmac("sha1", key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(bin % 1000000).padStart(6, "0");
}

const secretBytes = randomBytes(20);
const secret = base32Encode(secretBytes);
const now = Math.floor(Date.now() / 1000);
const code = totpAt(secret, now);

console.log("TOTP_SECRET =", secret);
console.log("当前验证码  =", code, "(有效期 ~30s，可在 Authenticator 中核对)");
console.log("otpauth URI = otpauth://totp/EarthOnline:%E8%B0%83%E8%AF%95?secret=" + secret.replace(/=+$/g, "") + "&issuer=EarthOnline");
