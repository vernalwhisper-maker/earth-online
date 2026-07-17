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
  loaded: false,

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
    set({ modelProvider: provider, apiKey, inference, tabBarOpacity, darkMode, showAIAssistant, reduceMotion, loaded: true });
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
}));

export default useSettingsStore;