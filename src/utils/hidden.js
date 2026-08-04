/**
 * 隐藏成就加解密工具（XOR 混淆）。
 * 目的：隐藏成就的名字、描述、图标在打包产物/源码中不以明文出现，
 * 运行时解密后才展示。密钥内置于源码属混淆级别，防"轻易搜索/提取"。
 *
 * 注意：本模块为纯函数，Node 与浏览器通用（使用全局 TextEncoder/TextDecoder/atob/btoa）。
 */

const XOR_KEY = "hx7#kQp2@vL9$wR3";

/** 文本加密 → base64（XOR 于 UTF-8 字节） */
export function encryptText(str) {
  const bytes = new TextEncoder().encode(str);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ XOR_KEY.charCodeAt(i % XOR_KEY.length);
  }
  let bin = "";
  for (let i = 0; i < out.length; i++) bin += String.fromCharCode(out[i]);
  return btoa(bin);
}

/** 文本解密（base64 → XOR → UTF-8） */
export function decryptText(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length);
  }
  return new TextDecoder().decode(out);
}

/** 二进制字节 XOR（用于图标等文件加密） */
export function xorBytes(bytes) {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ XOR_KEY.charCodeAt(i % XOR_KEY.length);
  }
  return out;
}

/**
 * 隐藏成就加密常量（由 scripts/gen-hidden.mjs 生成后填入，请勿手改）。
 * 保持与本仓库 achievements.js 引用一致。
 */
export const ENC = {
  // 破损系列（series: "破损"）
  name61: "jdWvxcrylr/fk9G2",
  desc61: "juOJxNDel5PukvOYwM/f19Ti0pzzud6Cp+zI3Z7Nt6HknI2ohO381+b0qIKukt2ZjfGex9Palprhkf+zy8ve29fm0JjtufqwqfXx37PXtID9kIi7jt/v",
  name62: "j/6oxenYl6jEn9W1w+PN19LC",
  desc62: "gNaHxtXGlIrAkvSTwM3o1PL805rLt/Odo/bN0YvatIP8naWvjNnB1+XLqbSQktS+jMGoxdnwlq7Jk9yxzffQ1PL835nAtcuPqevs0Zvm",
  name63: "gMewxuXqlanakeCF",
  desc63: "gMKcx9bClrrQk8amzMjJ1u3d05ntt+aCp+zI3rDotIfTl4uvjOPO1eXoqbSQk+qzj+ODxurNl6fZk9CRw9T61vjw0bTLt8OnqfHB37nStansn6mPgsbE",
  // 永脱轮回（隐藏单成就）
  name64: "jsiPy+/gmI/uk9en",
  desc64: "jMC+y+HgmLPan+2Pwuv+1fDX0prQvsy+qPLW3Zz8urbWnI2yj+vW293oq6W7",
  /** 永脱轮回触发句（加密） */
  trigger64: "jMC+y+HgmLPan+2Pwuv+1fDX0prQvsy+qPLW3Zz8urbWnI2yj+vW293oq6W7",
};
