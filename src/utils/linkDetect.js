// URL 自动检测工具

import { createElement } from "react";

/** 匹配 URL 的正则表达式 */
const URL_REGEX = /(https?:\/\/[^\s<]+[^\s<.,;:!?)}"'」］、，；：！）])/gi;

/**
 * 从文本中提取所有 URL。
 */
export function extractUrls(text) {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  return matches || [];
}

/**
 * 将文本中的 URL 渲染为可点击的链接（返回 React 元素，杜绝 innerHTML XSS）。
 * 文本段与链接段拆分渲染，链接属性由 React 安全处理，无需手动转义。
 */
export function renderLinks(text) {
  if (!text) return text;
  const nodes = [];
  let lastIndex = 0;
  // 每次调用新建正则实例，避免 /g 标志的 lastIndex 状态泄漏
  const regex = new RegExp(URL_REGEX.source, "gi");
  for (const match of text.matchAll(regex)) {
    const url = match[0];
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const display = url.length > 50 ? url.slice(0, 47) + "..." : url;
    nodes.push(
      createElement(
        "a",
        {
          key: lastIndex,
          href: url,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "text-emerald underline hover:brightness-110",
          onClick: (e) => e.stopPropagation(),
        },
        display
      )
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : text;
}

/**
 * 判断文本是否包含 URL。
 */
export function hasUrls(text) {
  return URL_REGEX.test(text);
}

export { URL_REGEX };
