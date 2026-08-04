// 生成隐藏成就加密数据：加密串 + 图标 bin
// 用法：node scripts/gen-hidden.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { encryptText, xorBytes } from "../src/utils/hidden.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const PLAIN = {
  name61: "存档损坏",
  desc61: "曾经确信不会忘记的人和事，如今只剩下模糊，连细节都无法还原",
  name62: "熟悉的陌生人",
  desc62: "记得一个人的习惯、语气和爱好却再也没有合适的身份靠近",
  name63: "过去囚笼",
  desc63: "身体成功进入了新的生活，精神却一直停留在磨合无法重来的瞬间",
  name64: "永脱轮回",
  desc64: "三花聚顶本是幻，脚下腾云亦非真",
  trigger64: "三花聚顶本是幻，脚下腾云亦非真",
};

// 1) 加密文本
const enc = {};
for (const [k, v] of Object.entries(PLAIN)) {
  enc[k] = encryptText(v);
  const back = JSON.stringify(enc[k]);
  console.log(k.padEnd(10), "->", back);
}

// 2) 图标加密（永脱轮回）
const pngPath = "D:\\下载\\永脱轮回.png";
const pngBytes = readFileSync(pngPath);
const encBytes = xorBytes(pngBytes);
const binPath = join(root, "public", "hidden", "yongtianlunhui.bin");
mkdirSync(join(root, "public", "hidden"), { recursive: true });
writeFileSync(binPath, encBytes);
console.log("icon bin:", binPath, "size:", encBytes.length, "(原", pngBytes.length, ")");

// 3) 自动写入 src/utils/hidden.js 的 ENC 常量块
const hiddenJsPath = join(root, "src", "utils", "hidden.js");
let src = readFileSync(hiddenJsPath, "utf8");
const encBlock = `export const ENC = {
  // 破损系列（series: "破损"）
  name61: ${JSON.stringify(enc.name61)},
  desc61: ${JSON.stringify(enc.desc61)},
  name62: ${JSON.stringify(enc.name62)},
  desc62: ${JSON.stringify(enc.desc62)},
  name63: ${JSON.stringify(enc.name63)},
  desc63: ${JSON.stringify(enc.desc63)},
  // 永脱轮回（隐藏单成就）
  name64: ${JSON.stringify(enc.name64)},
  desc64: ${JSON.stringify(enc.desc64)},
  /** 永脱轮回触发句："三花聚顶本是幻，脚下腾云亦非真" */
  trigger64: ${JSON.stringify(enc.trigger64)},
};`;
src = src.replace(/export const ENC = \{[\s\S]*?\};/, encBlock);
writeFileSync(hiddenJsPath, src);
console.log("hidden.js ENC updated");

// 4) 验证解密回明文一致
import { decryptText } from "../src/utils/hidden.js";
for (const [k, v] of Object.entries(PLAIN)) {
  const round = decryptText(enc[k]);
  if (round !== v) throw new Error(`MISMATCH ${k}: ${round}`);
}
console.log("roundtrip OK");
