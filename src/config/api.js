// AI API 提供者配置 — 单一数据源
// 所有用到 provider 端点/模型/标签的地方都应从此文件导入

export const API_PROVIDERS = {
  deepseek: {
    value: "deepseek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
    label: "DeepSeek V4 Flash",
  },
  zhipu: {
    value: "zhipu",
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model: "glm-4v-flash",
    label: "智谱 GLM-4V-Flash",
  },
  qwen: {
    value: "qwen",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen-vl-plus",
    label: "通义千问 Qwen-VL-Plus",
  },
};

// 在线模型选择列表（供 UI 弹窗使用）
export const ONLINE_MODELS = Object.values(API_PROVIDERS).map((p) => ({
  value: p.value,
  label: p.label,
}));

// 默认提供者
export const DEFAULT_PROVIDER = "deepseek";
