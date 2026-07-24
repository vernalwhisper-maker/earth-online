// URL 自动检测工具

/** 匹配 URL 的正则表达式 */
const URL_REGEX = /(https?:\/\/[^\s<]+[^\s<.,;:!?)}\]"'」］、，；：！）])/gi;

/**
 * 从文本中提取所有 URL。
 */
export function extractUrls(text) {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  return matches || [];
}

/**
 * 将文本中的 URL 渲染为可点击的链接（返回 React 安全的结构）。
 * 用于纯文本展示场景。
 */
export function renderLinks(text) {
  if (!text) return text;
  return text.replace(URL_REGEX, (url) => {
    const display = url.length > 50 ? url.slice(0, 47) + "..." : url;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-emerald underline hover:brightness-110" onclick="event.stopPropagation()">${display}</a>`;
  });
}

/**
 * 判断文本是否包含 URL。
 */
export function hasUrls(text) {
  return URL_REGEX.test(text);
}

export { URL_REGEX };
