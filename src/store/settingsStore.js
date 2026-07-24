import { create } from "zustand";
import { getSetting, setSetting } from "../db";
import { encrypt, decrypt } from "../utils/crypto";

const defaultInference = { temperature: 0.0, maxTokens: 800, topP: 1.0 };

const useSettingsStore = create((set, get) => ({
  modelProvider: "deepseek",
  apiKey: "",
  inference: { ...defaultInference },
  tabBarOpacity: 40,
  /** 深色模式: "light" | "dark" | "system" */
  darkMode: "system",
  showAIAssistant: true,
  reduceMotion: false,
  cardExpandAnim: false,
  useMirror: false,
  loaded: false,

  // 下载状态（内存态，不持久化）
  webllmBusy: false,
  webllmProgress: 0,
  webllmStatusText: "",
  webllmSpeed: "",
  webllmEta: "",

  // 本地/Ollama 配置
  useMode: "online",       // "online" | "ollama" | "webllm"
  localEndpoint: "",        // Ollama 服务地址
  localModel: "qwen2.5:1.5b",
  webllmModel: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  webllmDownloaded: false,
  webllmLoading: false,
  advancedDebug: false,
  debugFABEnabled: false,
  debugTagBarEnabled: false,
  debugNavBarEnabled: false,
  debugFabGlassEnabled: false,

  // 开发者模式 UI 状态（内存态，不持久化。退出页面后若 Store 调试开关仍为 true，
  // 重新进入 MoreSettingsPage 时由 loadSettings 恢复 devUnlocked/devCardOpen）
  devUnlocked: false,
  devCardOpen: false,

  loadSettings: async () => {
    const provider = (await getSetting("modelProvider")) || "deepseek";
    const encryptedKey = (await getSetting("apiKey")) || "";
    const apiKey = encryptedKey ? await decrypt(encryptedKey) : "";
    const inferenceRaw = await getSetting("inference");
    const inference = inferenceRaw
      ? Object.assign({}, defaultInference, inferenceRaw)
      : Object.assign({}, defaultInference);
    const tabBarOpacity = (await getSetting("tabBarOpacity")) ?? 40;
    const rawDark = await getSetting("darkMode");
    // 兼容旧版 boolean 值
    let darkMode = rawDark;
    if (typeof rawDark === "boolean") darkMode = rawDark ? "dark" : "light";
    else if (!rawDark) darkMode = "system";
    const showAIAssistant = (await getSetting("showAIAssistant")) ?? true;
    const reduceMotion = (await getSetting("reduceMotion")) ?? false;
    const cardExpandAnim = (await getSetting("cardExpandAnim")) ?? false;
    const useMirror = (await getSetting("useMirror")) ?? false;
    const useMode = (await getSetting("useMode")) || "online";
    const localEndpoint = (await getSetting("localEndpoint")) || "";
    const localModel = (await getSetting("localModel")) || "qwen2.5:1.5b";
    const webllmModel = (await getSetting("webllmModel")) || "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
    const webllmDownloaded = (await getSetting("webllmDownloaded")) ?? false;
    const advancedDebug = (await getSetting("advancedDebug")) ?? false;
    const debugFABEnabled = (await getSetting("debugFABEnabled")) ?? false;
    const debugTagBarEnabled = (await getSetting("debugTagBarEnabled")) ?? false;
    const debugNavBarEnabled = (await getSetting("debugNavBarEnabled")) ?? false;
    const debugFabGlassEnabled = (await getSetting("debugFabGlassEnabled")) ?? false;
    set({ modelProvider: provider, apiKey, inference, tabBarOpacity, darkMode: darkMode, showAIAssistant, reduceMotion, cardExpandAnim,
      useMirror,
      useMode, localEndpoint, localModel, webllmModel, webllmDownloaded,
      advancedDebug, debugFABEnabled, debugTagBarEnabled, debugNavBarEnabled, debugFabGlassEnabled,
      // 若调试总开关已开启，恢复卡片入口状态，避免"调试生效但入口消失"
      devUnlocked: advancedDebug, devCardOpen: advancedDebug,
      loaded: true });
  },

  setModelProvider: async (provider) => {
    await setSetting("modelProvider", provider);
    set({ modelProvider: provider });
  },

  setApiKey: async (key) => {
    const encrypted = await encrypt(key);
    await setSetting("apiKey", encrypted);
    set({ apiKey: key });
  },

  setInferenceParam: async (key, value) => {
    const current = get().inference;
    const updated = Object.assign({}, current);
    updated[key] = value;
    await setSetting("inference", updated);
    set({ inference: updated });
  },

  resetInference: async () => {
    const def = Object.assign({}, defaultInference);
    await setSetting("inference", def);
    set({ inference: def });
  },

  setDarkMode: async (value) => {
    await setSetting("darkMode", value);
    set({ darkMode: value });
  },

  setTabBarOpacity: async (value) => {
    await setSetting("tabBarOpacity", value);
    set({ tabBarOpacity: value });
  },

  setShowAIAssistant: async (value) => {
    await setSetting("showAIAssistant", value);
    set({ showAIAssistant: value });
  },

  setReduceMotion: async (value) => {
    await setSetting("reduceMotion", value);
    set({ reduceMotion: value });
  },

  setCardExpandAnim: async (value) => {
    await setSetting("cardExpandAnim", value);
    set({ cardExpandAnim: value });
  },

  setUseMirror: async (value) => {
    await setSetting("useMirror", value);
    set({ useMirror: value });
  },

  setUseMode: async (value) => {
    await setSetting("useMode", value);
    set({ useMode: value });
  },
  setLocalEndpoint: async (value) => {
    await setSetting("localEndpoint", value);
    set({ localEndpoint: value });
  },
  setLocalModel: async (value) => {
    await setSetting("localModel", value);
    set({ localModel: value });
  },
  setWebllmModel: async (value) => {
    await setSetting("webllmModel", value);
    set({ webllmModel: value });
  },
  setWebllmDownloaded: async (value) => {
    await setSetting("webllmDownloaded", value);
    set({ webllmDownloaded: value });
  },
  setWebllmLoading: async (value) => {
    set({ webllmLoading: value });
  },

  setAdvancedDebug: async (value) => {
    await setSetting("advancedDebug", value);
    set({ advancedDebug: value });
  },

  setDebugFABEnabled: async (value) => {
    await setSetting("debugFABEnabled", value);
    set({ debugFABEnabled: value });
  },

  setDebugTagBarEnabled: async (value) => {
    await setSetting("debugTagBarEnabled", value);
    set({ debugTagBarEnabled: value });
  },

  setDebugNavBarEnabled: async (value) => {
    await setSetting("debugNavBarEnabled", value);
    set({ debugNavBarEnabled: value });
  },

  setDebugFabGlassEnabled: async (value) => {
    await setSetting("debugFabGlassEnabled", value);
    set({ debugFabGlassEnabled: value });
  },

  setDevUnlocked: (value) => set({ devUnlocked: value }),
  setDevCardOpen: (value) => set({ devCardOpen: value }),

  // 标题开关关闭 → 卡片隐藏 + 重置触发 + 关闭所有调试功能
  closeDevCard: async () => {
    const s = get();
    if (s.advancedDebug) await setSetting("advancedDebug", false);
    if (s.debugFABEnabled) await setSetting("debugFABEnabled", false);
    if (s.debugTagBarEnabled) await setSetting("debugTagBarEnabled", false);
    if (s.debugNavBarEnabled) await setSetting("debugNavBarEnabled", false);
    if (s.debugFabGlassEnabled) await setSetting("debugFabGlassEnabled", false);
    set({ devCardOpen: false, devUnlocked: false, advancedDebug: false, debugFABEnabled: false, debugTagBarEnabled: false, debugNavBarEnabled: false, debugFabGlassEnabled: false });
  },

  setWebllmBusy: (value) => set({ webllmBusy: value }),
  setWebllmProgress: (value) => set({ webllmProgress: value }),
  setWebllmStatusText: (value) => set({ webllmStatusText: value }),
  setWebllmSpeed: (value) => set({ webllmSpeed: value }),
  setWebllmEta: (value) => set({ webllmEta: value }),
  resetWebllmDownload: () => set({ webllmBusy: false, webllmProgress: 0, webllmStatusText: "", webllmSpeed: "", webllmEta: "" }),
}));

export default useSettingsStore;
