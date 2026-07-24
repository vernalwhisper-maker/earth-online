// 调试功能默认参数 — App.jsx 和 DebugPage.jsx 共用的唯一默认值来源
// 修改此处即可全局生效，避免硬编码分散

export const DEBUG_DEFAULTS = {
  elasticity: 0.15,
  blurAmount: 0.0625,
  saturation: 140,
  displacementScale: 70,
  aberrationIntensity: 2,
  cornerRadius: 999,
  modeIdx: 0,          // "standard"
  overLight: false,
  shadowOpacity: 0.25,
};

export const MODE_OPTIONS = ["standard", "polar", "prominent", "shader"];

// 三个调试模块各自独立的 localStorage 键
export const STORAGE_KEY_SEGMENTED = "earth-online-debug-segmented";
export const STORAGE_KEY_TAGBAR   = "earth-online-debug-tagbar";
export const STORAGE_KEY_NAVBAR   = "earth-online-debug-navbar";
export const STORAGE_KEY_FAB      = "earth-online-debug-fab";

// 窗口（TabBar弹窗）毛玻璃默认参数
export const WINDOW_DEFAULTS = {
  blurPx: 35,
  saturation: 2.0,
  bgOpacity: 0.15,
  borderOpacity: 0.25,
  shadowOpacity: 0.2,
};

export const STORAGE_KEY_WINDOW = "earth-online-debug-window";

// 毛玻璃按钮默认参数（参照 glass-blur-button.html）
export const FAB_DEFAULTS = {
  blurPx: 18,
  saturation: 1.4,
  bgOpacity: 0.06,
  borderOpacity: 0.10,
  shadowOpacity: 0.5,
};

// 导航栏毛玻璃默认参数
export const NAVBAR_DEFAULTS = {
  blurPx: 18,
  saturation: 1.4,
  bgOpacity: 0.06,
  borderOpacity: 0.10,
  shadowOpacity: 0.5,
  borderRadius: 32,
};

// 兼容旧键（首次迁移用）
export const STORAGE_KEY = "earth-online-debug-params";
