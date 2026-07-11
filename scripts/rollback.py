import os, re

base = "D:\\Codex\\New\\earth-online\\src"

# 1. Rewrite settingsStore.js
with open(base + "/store/settingsStore.js", "w", encoding="utf-8") as f:
    f.write("""import { create } from "zustand";
import { getSetting, setSetting } from "../db";

const useSettingsStore = create((set, get) => ({
  modelProvider: "zhipu",
  apiKey: "",
  loaded: false,

  loadSettings: async () => {
    const provider = (await getSetting("modelProvider")) || "zhipu";
    const apiKey = (await getSetting("apiKey")) || "";
    set({ modelProvider: provider, apiKey, loaded: true });
  },

  setModelProvider: async (provider) => {
    await setSetting("modelProvider", provider);
    set({ modelProvider: provider });
  },

  setApiKey: async (key) => {
    await setSetting("apiKey", key);
    set({ apiKey: key });
  },
}));

export default useSettingsStore;
""")
print("settingsStore.js restored")

# 2. Remove clearAchievements from achievementStore
with open(base + "/store/achievementStore.js", "r", encoding="utf-8") as f:
    ac = f.read()

ac = re.sub(r'\s+clearAchievements:.*?\},', '', ac, flags=re.DOTALL)

with open(base + "/store/achievementStore.js", "w", encoding="utf-8") as f:
    f.write(ac)
print("achievementStore.js cleaned")

# 3. Rewrite SettingsPage.jsx
with open(base + "/pages/SettingsPage.jsx", "w", encoding="utf-8") as f:
    f.write("""import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Trash2, X } from "lucide-react";
import useSettingsStore from "../store/settingsStore";
import { exportAllNotes, clearAllData } from "../db";

export default function SettingsPage() {
  const { modelProvider, apiKey, setModelProvider, setApiKey } =
    useSettingsStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportAllNotes();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "earth-online-notes-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
    setExporting(false);
  };

  const handleClearData = async () => {
    await clearAllData();
    window.location.reload();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 pt-4 pb-6 max-w-2xl mx-auto"
    >
      <h1 className="text-[1.5rem] font-bold text-deep-ink mb-6">设置</h1>

      {/* AI 模型设置 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">
          AI 模型设置
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-deep-ink mb-1.5">
              模型选择
            </label>
            <select
              value={modelProvider}
              onChange={(e) => setModelProvider(e.target.value)}
              className="w-full px-3 py-2.5 border border-scribe rounded-input bg-surface text-deep-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald appearance-none"
            >
              <option value="zhipu">智谱 GLM-4V-Flash</option>
              <option value="qwen">通义千问 Qwen-VL-Plus</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-deep-ink mb-1.5">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入 API Key..."
              className="w-full px-3 py-2.5 border border-scribe rounded-input bg-surface text-deep-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald font-mono"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div
              className={"w-2 h-2 rounded-full " + (apiKey ? "bg-emerald" : "bg-warm-steel")}
            />
            <span className="text-warm-steel">
              {apiKey ? "已配置" : "未配置"}
            </span>
          </div>
        </div>
      </section>

      {/* 数据管理 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">
          数据管理
        </h2>
        <div className="space-y-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-between px-3 py-3 rounded-btn hover:bg-canvas-warm transition-colors"
          >
            <span className="text-sm text-deep-ink">导出所有笔记</span>
            <Download size={18} className="text-warm-steel" />
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-btn hover:bg-red-50 transition-colors"
          >
            <span className="text-sm text-rose">清空数据</span>
            <Trash2 size={18} className="text-rose" />
          </button>
        </div>
      </section>

      {/* 关于 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">
          关于
        </h2>
        <p className="text-sm font-mono text-faded-slate">版本 0.1</p>
        <p className="text-sm text-warm-steel mt-1">成就总数: 60</p>
      </section>

      <p className="text-center text-xs text-faded-slate mt-8">
        地球Online 笔记成就系统
      </p>

      {/* 确认弹窗 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft"
          >
            <h3 className="text-lg font-bold text-deep-ink mb-2">确认清空</h3>
            <p className="text-sm text-warm-steel mb-6">
              此操作将删除所有笔记和设置数据，且不可恢复。确定要继续吗？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink hover:bg-canvas-warm"
              >
                <X size={16} />
                取消
              </button>
              <button
                onClick={handleClearData}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose text-white rounded-btn text-sm hover:bg-red-600"
              >
                <Trash2 size={16} />
                确认清空
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
""")
print("SettingsPage.jsx restored")

# 4. Fix NoteEditorPage.jsx
with open(base + "/pages/NoteEditorPage.jsx", "r", encoding="utf-8") as f:
    nep = f.read()

nep = nep.replace(
    "const { modelProvider, apiKey, inference } = useSettingsStore();",
    "const { modelProvider, apiKey } = useSettingsStore();"
)
nep = nep.replace(
    "const matchedIds = await matchAchievements(noteContent, apiKey, modelProvider, inference);",
    "const matchedIds = await matchAchievements(noteContent, apiKey, modelProvider);"
)

with open(base + "/pages/NoteEditorPage.jsx", "w", encoding="utf-8") as f:
    f.write(nep)
print("NoteEditorPage.jsx restored")

print("\\nRollback complete!")
