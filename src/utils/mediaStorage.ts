// 媒体文件存储工具
// 三环境适配：开发服务器(localhost) / 网页端(部署) / 安卓端(APK)
// - Capacitor 环境：文件写入原生文件系统，用 convertFileSrc 转换为 WebView 可加载 URL
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

/** 转换 Capacitor 文件路径为 WebView 可加载 URL */
function toWebViewUrl(filePath: string): string {
  try {
    const cap = (window as any).Capacitor;
    if (cap?.convertFileSrc) {
      return cap.convertFileSrc(filePath);
    }
  } catch {}
  return filePath;
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
      directory: Directory.Data,
      recursive: true,
    });
    // getUri 获取 content:// 格式 URI（WebView 可加载）
    const uriResult = await Filesystem.getUri({
      path: `earth-online/media/${fileName}`,
      directory: Directory.Data,
    });
    const uri = toWebViewUrl(uriResult.uri);
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

  // === 浏览器端：转 Data URL（base64）持久化，避免 Blob URL 刷新失效 ===
  let blob: Blob = file;
  if (isImage) {
    try { blob = await compressImage(file); } catch { blob = file; }
  }
  // Data URL 可写入 IndexedDB / 导出文件，重启后依然有效（Blob URL 会随会话失效）
  const dataUrl = await blobToDataURL(blob);

  if (isImage) {
    return {
      uri: dataUrl,
      markdown: `![${file.name}](${dataUrl})`,
      html: `<img src="${dataUrl}" alt="${file.name}" style="max-width:100%;border-radius:8px;" />`,
      isImage: true,
      fileName,
    };
  }
  return {
    uri: dataUrl,
    markdown: `[音频: ${file.name}](${dataUrl})`,
    html: `<audio controls src="${dataUrl}" style="width:100%;max-width:400px;border-radius:8px;"></audio>`,
    isImage: false,
    fileName,
  };
}

/** Blob → Data URL（base64，可持久化） */
async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(blob);
  });
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
