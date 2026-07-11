// 页面背景与动效主题 — 参考小米澎湃笔记 PageBackgroundData + MAML 动画系统

// ===== 背景图案类型 =====
export const BG_PATTERNS = [
  { id: "solid", label: "纯色", icon: "Square" },
  { id: "grid", label: "网格", icon: "Grid3x3" },
  { id: "dot", label: "点阵", icon: "CircleDot" },
  { id: "lined", label: "横线", icon: "AlignJustify" },
];

export const DEFAULT_BG_PATTERN = "solid";

// ===== 背景颜色主题（扩展自 BG_COLORS）=====
export const BG_THEMES = [
  { id: 0, label: "默认白", color: "#ffffff", textClass: "text-deep-ink", border: "border-scribe" },
  { id: 1, label: "暖阳", color: "#fffbeb", textClass: "text-deep-ink", border: "border-amber-200" },
  { id: 2, label: "薄荷", color: "#ecfdf5", textClass: "text-deep-ink", border: "border-emerald-200" },
  { id: 3, label: "天空", color: "#f0f9ff", textClass: "text-deep-ink", border: "border-sky-200" },
  { id: 4, label: "薰衣草", color: "#faf5ff", textClass: "text-deep-ink", border: "border-purple-200" },
  { id: 5, label: "玫瑰", color: "#fff1f2", textClass: "text-deep-ink", border: "border-rose-200" },
  { id: 6, label: "深夜", color: "#111827", textClass: "text-gray-200", border: "border-gray-700" },
];

// ===== 动效主题 =====
export const ANIM_THEMES = [
  { id: "none", label: "无动效", description: "简洁无动画", icon: "Minus" },
  { id: "starry", label: "星空", description: "闪烁星光缓缓飘落", icon: "Star" },
  { id: "float", label: "浮游", description: "几何图形漂浮", icon: "Sparkles" },
  { id: "shimmer", label: "流光", description: "柔和光影流动", icon: "Droplets" },
];

export const DEFAULT_ANIM_THEME = "none";

// ===== 默认完整主题配置 =====
export function createDefaultTheme(overrides = {}) {
  return {
    bgColorId: 0,
    bgPattern: DEFAULT_BG_PATTERN,
    animTheme: DEFAULT_ANIM_THEME,
    ...overrides,
  };
}
