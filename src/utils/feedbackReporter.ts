// 使用统计收集与自动上报
// 策略：每日首次打开时自动发送（北京时间），纯本地统计，不上传隐私

const STORAGE_PREFIX = "earth-online-stats-";

/** 获取北京时间今天的日期字符串 "2026-07-22" */
function todayBeijing(): string {
  const now = new Date();
  const beijing = new Date(now.getTime() + 8 * 3600 * 1000);
  return beijing.toISOString().slice(0, 10);
}

function getStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage(key: string, value: any) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {}
}

/** 解析设备型号 */
function getDeviceModel(): string {
  try {
    // Capacitor 环境
    const cap = (window as any).Capacitor;
    if (cap?.getPlatform?.()) {
      return `${cap.getPlatform()} ${(navigator as any).deviceMemory || ""}`.trim() || navigator.userAgent.slice(navigator.userAgent.lastIndexOf("/") + 1) || "未知设备";
    }
  } catch {}
  // 浏览器环境
  const ua = navigator.userAgent;
  if (/Android/.test(ua)) {
    const m = ua.match(/Android\s[\d.]+;\s([^)]+)/);
    return m ? m[1].trim() : "Android";
  }
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS 设备";
  return "Desktop Browser";
}

/** 获取系统版本 */
function getOSVersion(): string {
  const ua = navigator.userAgent;
  const m = ua.match(/Android\s([\d.]+)/);
  if (m) return `Android ${m[1]}`;
  const i = ua.match(/OS\s(\d+_\d+)/);
  if (i) return `iOS ${i[1].replace("_", ".")}`;
  return ua.includes("Windows") ? "Windows" : ua.includes("Mac") ? "macOS" : "Unknown";
}

/** 获取 APP 版本 */
function getAppVersion(): string {
  try {
    return (window as any).Capacitor?.getPlatform?.() ? "1.2.1" : "web";
  } catch {
    return "web";
  }
}

export interface FeedbackStats {
  firstOpenedAt: string;
  openCount: number;
  componentStats: {
    editor: number;
    settings: number;
    achievements: number;
    gallery: number;
    ai: number;
    tags: number;
  };
}

/** 初始化统计（首次打开时调用） */
export function initStats() {
  if (!getStorage("initialized", false)) {
    setStorage("initialized", true);
    setStorage("firstOpenedAt", new Date().toISOString());
    setStorage("openCount", 1);
    setStorage("componentStats", {
      editor: 0, settings: 0, achievements: 0, gallery: 0, ai: 0, tags: 0,
    });
  } else {
    setStorage("openCount", getStorage<number>("openCount", 0) + 1);
  }
}

/** 递增组件打开计数 */
export function incrementComponentStat(component: string) {
  const stats = getStorage<FeedbackStats["componentStats"]>("componentStats", {
    editor: 0, settings: 0, achievements: 0, gallery: 0, ai: 0, tags: 0,
  });
  if (component in stats) {
    (stats as any)[component] = ((stats as any)[component] || 0) + 1;
  }
  setStorage("componentStats", stats);
}

/** 获取完整统计数据 */
export function getStats(): FeedbackStats {
  return {
    firstOpenedAt: getStorage("firstOpenedAt", ""),
    openCount: getStorage("openCount", 0),
    componentStats: getStorage("componentStats", {
      editor: 0, settings: 0, achievements: 0, gallery: 0, ai: 0, tags: 0,
    }),
  };
}

/** 检查是否应该上报（根据远程配置的间隔时间，默认24小时） */
export function shouldReport(): boolean {
  // 读远程配置
  let intervalHours = 168;
  let autoReport = true;
  try {
    const rc = (window as any).__earthRC;
    if (rc) {
      intervalHours = rc.getExperiment("feedbackIntervalHours", 24);
      autoReport = rc.isFeatureEnabled("feedbackAutoReport");
    }
  } catch {}

  if (!autoReport) return false;

  const lastReport = getStorage("lastReportAt", 0) as number;
  if (!lastReport) return true;
  const elapsed = (Date.now() - lastReport) / 3600000; // 小时
  return elapsed >= intervalHours;
}

/** 检查今天是否已上报（兼容旧逻辑） */
export function hasReportedToday(): boolean {
  return getStorage("lastReportDate", "") === todayBeijing();
}

/** 构建上报数据 */
function buildReportBody(): string {
  const stats = getStats();
  const deviceModel = getDeviceModel();
  const osVersion = getOSVersion();
  const appVersion = getAppVersion();
  const dateBeijing = todayBeijing();

  return [
    `### 📱 设备信息`,
    `- 设备型号: ${deviceModel}`,
    `- 系统版本: ${osVersion}`,
    `- APP 版本: ${appVersion}`,
    `- 首次使用: ${stats.firstOpenedAt ? new Date(stats.firstOpenedAt).toLocaleDateString("zh-CN") : "未知"}`,
    ``,
    `### 📊 使用统计`,
    `- 打开次数: ${stats.openCount}`,
    `- 报告日期: ${dateBeijing}`,
    ``,
    `### 🧩 功能使用频率`,
    `| 功能 | 次数 |`,
    `|------|------|`,
    `| 编辑器 | ${stats.componentStats.editor} |`,
    `| 设置 | ${stats.componentStats.settings} |`,
    `| 成就 | ${stats.componentStats.achievements} |`,
    `| 成就画廊 | ${stats.componentStats.gallery} |`,
    `| AI 助手 | ${stats.componentStats.ai} |`,
    `| 标签 | ${stats.componentStats.tags} |`,
  ].join("\n");
}

/** 上报反馈 — Discord Webhook 优先，GitHub Issues 备通道 */
export async function submitFeedback(): Promise<{ ok: boolean; message: string }> {
  const webhookUrl = (import.meta as any).env?.VITE_DISCORD_WEBHOOK_URL || "";
  const ghToken = (import.meta as any).env?.VITE_GH_FEEDBACK_TOKEN || "";

  const title = `[反馈] ${getDeviceModel()} ${getOSVersion()} v${getAppVersion()} — ${todayBeijing()}`;
  const body = buildReportBody();

  // 优先 Discord
  if (webhookUrl) {
    try {
      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "地球Online 反馈",
          embeds: [{
            title,
            description: body,
            color: 0x10b981,
            timestamp: new Date().toISOString(),
          }],
        }),
      });
      if (resp.ok) {
        setStorage("lastReportAt", Date.now());
        setStorage("lastReportDate", todayBeijing());
        return { ok: true, message: "反馈已发送" };
      }
    } catch { /* 回退到 GitHub */ }
  }

  // GitHub Issues 备通道
  if (ghToken) {
    try {
      const resp = await fetch(
        "https://api.github.com/repos/vernalwhisper-maker/earth-online/issues",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${ghToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ title, body }),
        }
      );
      if (resp.ok) {
        setStorage("lastReportDate", todayBeijing());
        return { ok: true, message: "反馈已发送" };
      }
      if (resp.status === 401) return { ok: false, message: "Token 无效" };
      if (resp.status === 422) return { ok: false, message: "今天已发送过反馈" };
      return { ok: false, message: `上报失败: ${resp.status}` };
    } catch (err: any) {
      return { ok: false, message: `网络错误: ${err.message}` };
    }
  }

  return { ok: false, message: "未配置传输通道" };
}
