// .eon 文件格式工具
// 格式: EON1\n<base64(salt+iv+ciphertext)>\n

import { encryptWithPassword, decryptWithPassword } from "./crypto";

const MAGIC = "EON1";
const FILE_EXT = ".eon";

export async function exportToEonBlob(notes, password) {
  const payload = JSON.stringify(notes, null, 2);
  const encrypted = await encryptWithPassword(payload, password);
  const content = MAGIC + "\n" + encrypted + "\n";
  return new Blob([content], { type: "application/octet-stream" });
}

export function generateFilename() {
  const date = new Date().toISOString().slice(0, 10);
  return "earth-online-notes-" + date + FILE_EXT;
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

export { FILE_EXT };
