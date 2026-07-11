// AES-GCM 加密工具
// 1. 本地密钥加密 — 用于 API Key 存储（密钥存 localStorage）
// 2. 密码加密 — 用于笔记导出（PBKDF2 + AES-GCM）

const KEY_STORAGE = "earth-online-crypto-key";
const KEY_LENGTH = 256;
const MASK = [0xA3, 0x7B, 0xC5, 0x1E, 0x6D, 0x90, 0xF4, 0x28,
              0x5B, 0xCE, 0x81, 0x3F, 0x72, 0xE9, 0x4C, 0x16,
              0xD8, 0x07, 0xBA, 0x5F, 0x91, 0x2E, 0x63, 0xFC,
              0x48, 0x15, 0x87, 0x3A, 0xDE, 0x61, 0x09, 0xBE];

const PBKDF2_ITERATIONS = 600000;
const SALT_BYTES = 16;

function xorMask(bytes) {
  const result = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    result[i] = bytes[i] ^ MASK[i % MASK.length];
  }
  return result;
}

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuf(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getOrCreateKey() {
  const stored = localStorage.getItem(KEY_STORAGE);
  if (stored) {
    try {
      const masked = base64ToBuf(stored);
      const raw = xorMask(masked);
      return await crypto.subtle.importKey(
        "raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
      );
    } catch (e) {
      console.warn("Crypto key corrupted, generating new one:", e);
      localStorage.removeItem(KEY_STORAGE);
    }
  }
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: KEY_LENGTH }, true, ["encrypt", "decrypt"]
  );
  const raw = await crypto.subtle.exportKey("raw", key);
  const masked = xorMask(new Uint8Array(raw));
  localStorage.setItem(KEY_STORAGE, bufToBase64(masked));
  return key;
}

export async function encrypt(plaintext) {
  if (!plaintext) return "";
  try {
    const key = await getOrCreateKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv }, key, encoded
    );
    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return bufToBase64(combined);
  } catch (e) {
    console.error("Encryption failed:", e);
    return plaintext;
  }
}

export async function decrypt(ciphertext) {
  if (!ciphertext) return "";
  try {
    const key = await getOrCreateKey();
    const combined = base64ToBuf(ciphertext);
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv }, key, data
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error("Decryption failed:", e);
    return ciphertext;
  }
}

// === Password-based encryption (for notes export/import) ===

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptWithPassword(plaintext, password) {
  if (!plaintext || !password) throw new Error("Missing data or password");
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, encoded
  );
  // Format: salt(16) + iv(12) + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + new Uint8Array(ciphertext).length);
  combined.set(salt);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return bufToBase64(combined);
}

export async function decryptWithPassword(payload, password) {
  if (!payload || !password) throw new Error("Missing data or password");
  const combined = base64ToBuf(payload);
  if (combined.length < SALT_BYTES + 12 + 1) throw new Error("Invalid payload");
  const salt = combined.slice(0, SALT_BYTES);
  const iv = combined.slice(SALT_BYTES, SALT_BYTES + 12);
  const data = combined.slice(SALT_BYTES + 12);
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv }, key, data
  );
  return new TextDecoder().decode(decrypted);
}
