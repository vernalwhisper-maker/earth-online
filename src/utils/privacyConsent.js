// 隐私使用须知 — 首次打开 APP 时弹出一次
// 存储: localStorage "earth-online-privacy-consent" = true/false

const STORAGE_KEY = "earth-online-privacy-consent";

export function hasConsented() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setConsent(agreed) {
  try {
    localStorage.setItem(STORAGE_KEY, String(agreed));
  } catch {}
}

export const PRIVACY_TEXT = {
  title: "使用须知",
  intro:
    "感谢使用 地球Online！为持续改进这款软件，我们希望收集一些**完全匿名的使用统计数据**来了解大家如何使用各个功能。",
  what: {
    title: "我们会收集：",
    items: [
      "设备型号（如 iPhone 15 Pro）",
      "操作系统版本（如 Android 14）",
      "APP 软件版本号",
      "APP 累计打开次数",
      "各功能模块的使用频率（编辑器、设置、成就等）",
    ],
  },
  whatNot: {
    title: "我们**不会**收集：",
    items: [
      "您的笔记内容",
      "您插入的图片、音频",
      "您的密码或 API Key",
      "您的个人信息或位置",
      "任何可用于识别您身份的数据",
    ],
  },
  how: {
    title: "运作方式",
    text: "统计数据保存在您的设备本地。如果您同意，每天最多自动发送一次汇总报告到开发者的 GitHub Issues（完全公开透明）。您可以随时在设置中手动发送或查看统计数据。",
  },
  final: "所有数据仅用于改进 地球Online 的用户体验，不会出售或分享给任何第三方。",
};
