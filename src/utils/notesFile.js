// .eon 文件格式工具
// 格式: EON1\n<base64(salt+iv+ciphertext)>\n

import { encryptWithPassword, decryptWithPassword } from "./crypto";

const MAGIC = "EON1";
const FILE_EXT = ".eon";
const MD_FILE_EXT = ".md";
/** 多笔记 Markdown 分隔符 */
const MD_SEPARATOR = "\n---\n";

export async function exportToEonBlob(notes, password) {
  const payload = JSON.stringify(notes, null, 2);
  const encrypted = await encryptWithPassword(payload, password);
  const content = MAGIC + "\n" + encrypted + "\n";
  return new Blob([content], { type: "application/octet-stream" });
}

export function generateFilename() {
  const now = new Date();
  const y = now.getFullYear();
  const M = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${y}${M}${d}_${h}${m}_笔记文件${FILE_EXT}`;
}

export async function parseEonFile(file, password) {
  const text = await file.text();

  const newlineIdx = text.indexOf("\n");
  if (newlineIdx === -1) {
    throw new Error("Invalid file format");
  }

  const magic = text.slice(0, newlineIdx).trim();
  if (magic !== MAGIC) {
    throw new Error("Not a valid .eon file");
  }

  const payload = text.slice(newlineIdx + 1).trim();
  if (!payload) {
    throw new Error("Empty file");
  }

  const decrypted = await decryptWithPassword(payload, password);
  try {
    const notes = JSON.parse(decrypted);
    if (!Array.isArray(notes)) {
      throw new Error("Invalid data format");
    }
    return notes;
  } catch (e) {
    throw new Error("Wrong password or corrupted file");
  }
}

// ====== M 格式（Markdown）工具函数 ======

/**
 * 将单篇笔记转换为 Markdown 字符串。
 * 格式：第一行为 "# 标题"，后续为正文。
 */
export function exportNoteToMarkdown(note) {
  const title = note.title || "无标题";
  const body = note.contentMarkdown || note.body || "";
  let md = "# " + title + "\n\n" + body;
  return md.trim();
}

/**
 * 批量导出笔记为 Markdown Blob。
 * 多篇笔记用 --- 分隔。
 */
export function exportToMarkdownBlob(notes) {
  if (!Array.isArray(notes) || notes.length === 0) {
    return new Blob([""], { type: "text/markdown;charset=utf-8" });
  }
  const parts = notes.map((note) => exportNoteToMarkdown(note));
  const content = parts.join(MD_SEPARATOR);
  return new Blob([content], { type: "text/markdown;charset=utf-8" });
}

/**
 * 根据笔记标题生成 .md 文件名。
 */
export function generateMarkdownFilename(note) {
  const now = new Date();
  const y = now.getFullYear();
  const M = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  // 用标题前 20 个字符作为文件名的一部分
  const titleSlug = (note.title || "笔记")
    .replace(/[\\/:*?"<>|]/g, "")  // 移除非法文件名字符
    .trim()
    .slice(0, 20);
  return `${y}${M}${d}_${h}${m}_${titleSlug}${MD_FILE_EXT}`;
}

/**
 * 批量导出的 .md 文件名（以时间命名）。
 */
export function generateBatchMarkdownFilename() {
  const now = new Date();
  const y = now.getFullYear();
  const M = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${y}${M}${d}_${h}${m}_笔记合集${MD_FILE_EXT}`;
}

/**
 * 从 Markdown 文本中解析笔记数组。
 * 按 --- 分隔符分割，每段首行 "# 标题" 提取为标题，其余为 body。
 */
export function parseMarkdownFile(text) {
  if (!text || !text.trim()) return [];
  const segments = text.split(MD_SEPARATOR);
  const notes = [];
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const lines = trimmed.split("\n");
    let title = "无标题";
    let bodyLines = [];
    if (lines[0].startsWith("# ")) {
      title = lines[0].slice(2).trim();
      bodyLines = lines.slice(1);
    } else {
      bodyLines = lines;
    }
    const body = bodyLines.join("\n").trim();
    notes.push({
      title,
      body: body,
      noteType: "journal",
      tags: [],
      isPinned: false,
    });
  }
  return notes;
}

export { FILE_EXT, MD_FILE_EXT };

