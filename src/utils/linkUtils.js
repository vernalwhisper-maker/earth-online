import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * 链接工具（跨 Web / Capacitor APP）：
 * - 原生端通过 UrlPlugin（openUrl / copyText，均免权限）
 * - Web 端兜底：navigator.clipboard / window.open
 */

const UrlPlugin = registerPlugin("UrlPlugin");

/** 网盘分享链接 1（123云盘）——WebLLM 模型资源（内置兜底，远程优先） */
export const WEBPAN_LINK_1 = "https://1850639519.share.123pan.cn/123pan/2zHxvd-VJCk3";

/** GitHub Issue 链接源（链接可能变更，放 GitHub Issues 动态获取，避免每次发版） */
const GH_OWNER = "vernalwhisper-maker";
const GH_REPO = "earth-online";
// 固定 Issue 编号（webllm-link 标签创建受 token 权限限制，改用固定编号定位；
// 更换链接时直接编辑该 Issue 正文即可，App 24h 内自动生效）
const GH_ISSUE_NUMBER = 23;
const CACHE_KEY = "earth-online-webpan-link";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

/**
 * 从 GitHub Issue 获取最新网盘链接（未认证 API，public repo 可用）。
 * 约定：固定 Issue #GH_ISSUE_NUMBER，正文中第一个 URL 即链接。
 */
async function fetchRemoteLink() {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/issues/${GH_ISSUE_NUMBER}`;
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) return null;
  const issue = await res.json();
  const body = issue?.body || "";
  const m = body.match(/https?:\/\/[^\s"'<>）)】]+/);
  return m ? m[0] : null;
}

/** 读取缓存的远程链接（含过期时间戳） */
function readCachedLink() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { url, ts } = JSON.parse(raw);
    if (!url) return null;
    if (Date.now() - ts > CACHE_TTL) return null; // 过期
    return url;
  } catch {
    return null;
  }
}

function writeCachedLink(url) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ url, ts: Date.now() }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * 获取网盘分享链接：远程 GitHub Issues（缓存 24h）→ 内置兜底。
 */
export async function getWebpanLink() {
  const cached = readCachedLink();
  if (cached) return cached;
  const remote = await fetchRemoteLink().catch(() => null);
  if (remote) {
    writeCachedLink(remote);
    return remote;
  }
  return WEBPAN_LINK_1;
}

/** 复制文本到剪贴板（APP 原生 ClipboardManager / Web navigator.clipboard + execCommand 兜底） */
export async function copyTextToClipboard(text) {
  if (Capacitor.isNativePlatform()) {
    try {
      await UrlPlugin.copyText({ text });
      return true;
    } catch (e) {
      console.error("UrlPlugin.copyText failed:", e);
    }
  }
  // Web / 原生失败兜底
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (err) {
      return false;
    }
  }
}

/** 在系统浏览器中打开外部链接（APP 原生 ACTION_VIEW / Web window.open） */
export async function openExternalUrl(url) {
  if (Capacitor.isNativePlatform()) {
    try {
      await UrlPlugin.openUrl({ url });
      return true;
    } catch (e) {
      console.error("UrlPlugin.openUrl failed:", e);
    }
  }
  window.open(url, "_blank", "noopener");
  return true;
}
