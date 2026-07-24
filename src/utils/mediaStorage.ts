// 媒体文件存储工具
// 三环境适配：开发服务器(localhost) / 网页端(部署) / 安卓端(APK)
// - Capacitor 环境：文件写入原生文件系统（Documents），返回 file:// URI
// - 浏览器环境：使用 Blob URL 临时引用 + 压缩图片

import { Filesystem, Directory } from "@capacitor/filesystem";

/** 是否运行在 Capacitor 原生环境中 */
function isCapacitor() {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/** 压缩图片：限制最大宽高，保持宽高比 */
async function compressImage(file: File, maxSize = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxSize && height <= maxSize) {
        resolve(file); // 不需要压缩
        return;
      }
      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("图片压缩失败"));
      }, file.type || "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("图片加载失败")); };
    img.src = url;
  });
}

/**
 * 存储媒体文件（图片/音频）
 * @returns { uri, html } — uri 可用于 <img src> 或 <audio src>，html 是完整的插入标记文字
 */
export async function storeMediaFile(file: File): Promise<{
  uri: string;
  markdown: string;
  html: string;
  isImage: boolean;
  fileName: string;
}> {
  const isImage = file.type.startsWith("image/");
  const fileName = `${Date.now()}_${file.name}`;

  if (isCapacitor()) {
    // === Capacitor 安卓端：写入原生文件系统 ===
    const base64 = await fileToBase64(file);
    const result = await Filesystem.writeFile({
      path: `earth-online/media/${fileName}`,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
    const uri = result.uri;
    if (isImage) {
      return {
        uri,
        markdown: `![${file.name}](${uri})`,
        html: `<img src="${uri}" alt="${file.name}" style="max-width:100%;border-radius:8px;" />`,
        isImage: true,
        fileName,
      };
    }
    return {
      uri,
      markdown: `[音频: ${file.name}](${uri})`,
      html: `<audio controls src="${uri}" style="width:100%;max-width:400px;border-radius:8px;"></audio>`,
      isImage: false,
      fileName,
    };
  }

  // === 浏览器端：用 Blob URL（临时）+ 压缩图片 ===
  let blob: Blob = file;
  if (isImage) {
    try { blob = await compressImage(file); } catch { blob = file; }
  }
  const url = URL.createObjectURL(blob);

  if (isImage) {
    return {
      uri: url,
      markdown: `![${file.name}](${url})`,
      html: `<img src="${url}" alt="${file.name}" style="max-width:100%;border-radius:8px;" />`,
      isImage: true,
      fileName,
    };
  }
  return {
    uri: url,
    markdown: `[音频: ${file.name}](${url})`,
    html: `<audio controls src="${url}" style="width:100%;max-width:400px;border-radius:8px;"></audio>`,
    isImage: false,
    fileName,
  };
}

/** File → Base64（不带 data: 前缀） */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}
