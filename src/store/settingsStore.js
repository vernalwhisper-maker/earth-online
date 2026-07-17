import { create } from "zustand";
import { getSetting, setSetting } from "../db";
import { encrypt, decrypt } from "../utils/crypto";

const defaultInference = { temperature: 0.0, maxTokens: 800, topP: 1.0 };

const useSettingsStore = create((set, get) => ({
  modelProvider: "deepseek",
  apiKey: "",
  inference: { ...defaultInference },
  tabBarOpacity: 40,
  darkMode: false,
  showAIAssistant: true,
  reduceMotion: false,
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
  localEndpoint: "",        // Ollama: http://192.168.x.x:11434
  localModel: "qwen2.5:1.5b",
  webllmModel: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  webllmDownloaded: false,
  webllmLoading: false,

  loadSettings: async () => {
    const provider = (await getSetting("modelProvider")) || "deepseek";
    const encryptedKey = (await getSetting("apiKey")) || "";
    const apiKey = encryptedKey ? await decrypt(encryptedKey) : "";
    const inferenceRaw = await getSetting("inference");
    const inference = inferenceRaw
      ? Object.assign({}, defaultInference, inferenceRaw)
      : Object.assign({}, defaultInference);
    const tabBarOpacity = (await getSetting("tabBarOpacity")) ?? 40;
    const darkMode = (await getSetting("darkMode")) ?? false;
    const showAIAssistant = (await getSetting("showAIAssistant")) ?? true;
    const reduceMotion = (await getSetting("reduceMotion")) ?? false;
    const useMirror = (await getSetting("useMirror")) ?? false;
    const useMode = (await getSetting("useMode")) || "online";
    const localEndpoint = (await getSetting("localEndpoint")) || "";
    const localModel = (await getSetting("localModel")) || "qwen2.5:1.5b";
    const webllmModel = (await getSetting("webllmModel")) || "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
    const webllmDownloaded = (await getSetting("webllmDownloaded")) ?? false;
    set({ modelProvider: provider, apiKey, inference, tabBarOpacity, darkMode, showAIAssistant, reduceMotion,
      useMirror,
      useMode, localEndpoint, localModel, webllmModel, webllmDownloaded, loaded: true });
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

  setWebllmBusy: (value) => set({ webllmBusy: value }),
  setWebllmProgress: (value) => set({ webllmProgress: value }),
  setWebllmStatusText: (value) => set({ webllmStatusText: value }),
  setWebllmSpeed: (value) => set({ webllmSpeed: value }),
  setWebllmEta: (value) => set({ webllmEta: value }),
  resetWebllmDownload: () => set({ webllmBusy: false, webllmProgress: 0, webllmStatusText: "", webllmSpeed: "", webllmEta: "" }),
}));

export default useSettingsStore;
