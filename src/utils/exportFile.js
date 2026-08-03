// 导出/导入文件工具
// - Android（Capacitor）：原生 DownloadPlugin → MediaStore 写入系统 Download/EarthOnline/
//   （免存储权限、不触发系统 SAF 弹窗；Android 10+ 与 11+ 均可用）
// - 其他环境（浏览器/开发服务器）：Web 下载降级

/** 准确识别运行环境：返回 "android" | "ios" | "web" | null（未知） */
export function getPlatform() {
  try {
    const cap = window.Capacitor;
    if (cap?.getPlatform) return cap.getPlatform();
    if (cap?.isNativePlatform?.()) return "native";
  } catch {}
  return null;
}

/** 是否运行在 Capacitor 原生容器中（APK）— 仅 android/ios 视为原生，web 注入不算 */
export function isCapacitor() {
  const p = getPlatform();
  return p === "android" || p === "ios";
}

/** 是否 Android 原生（APK） */
export function isAndroid() {
  return getPlatform() === "android";
}

/**
 * 优先通过原生插件保存到系统 Download；返回 true 表示原生写入成功，
 * 返回 false 表示需走 Web 下载降级。
 */
export async function saveFileToDownloads(base64, fileName) {
  try {
    if (isAndroid() && window.Capacitor?.Plugins?.DownloadPlugin) {
      await window.Capacitor.Plugins.DownloadPlugin.saveToDownloads({ data: base64, fileName });
      return true;
    }
  } catch (err) {
    console.warn("Native save failed, falling back to web download:", err);
  }
  return false;
}

/**
 * 列出「下载/EarthOnline/」下已导出的文件（仅 Android，app 自建文件免 SAF）。
 * 返回 [{ name, uri, size }]；非 Android 或失败返回 null（调用方走 Web 降级）。
 */
export async function listDownloadedFiles() {
  try {
    if (isAndroid() && window.Capacitor?.Plugins?.DownloadPlugin) {
      const res = await window.Capacitor.Plugins.DownloadPlugin.listDownloads();
      return res?.files || [];
    }
  } catch (err) {
    console.warn("listDownloads failed:", err);
  }
  return null;
}

/**
 * 读取「下载/EarthOnline/」下导出文件内容（免 SAF 弹窗）。
 * 返回 Blob；非 Android 或失败返回 null。
 */
export async function readDownloadFile(uri) {
  try {
    if (isAndroid() && window.Capacitor?.Plugins?.DownloadPlugin) {
      const res = await window.Capacitor.Plugins.DownloadPlugin.readDownloadFile({ uri });
      if (res?.data) return base64ToBlob(res.data);
    }
  } catch (err) {
    console.warn("readDownloadFile failed:", err);
  }
  return null;
}

/** base64（无 data: 前缀）→ Blob */
export function base64ToBlob(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes]);
}

/** Blob → base64（无 data: 前缀） */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(blob);
  });
}

/** 浏览器下载降级；返回是否成功触发 */
export function downloadBlobInBrowser(blob, fileName) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // 延迟释放 Blob URL，避免部分浏览器下载未完成即失效
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.warn("Web download failed:", err);
    return false;
  }
}
