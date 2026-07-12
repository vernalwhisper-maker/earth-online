import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw } from "lucide-react";
import RangeSlider from "../../components/ui/RangeSlider";
import GlassSwitch from "../../components/ui/GlassSwitch";
import useSettingsStore from "../../store/settingsStore";

export default function AISettingsPage({ onBack }) {
  const { modelProvider, apiKey, inference, setModelProvider, setApiKey, setInferenceParam, resetInference, showAIAssistant, setShowAIAssistant } = useSettingsStore();
  const { loaded } = useSettingsStore();

  if (!loaded) {
    return <div className="px-4 pt-4"><div className="w-10 h-10 border-2 border-emerald/30 border-t-emerald rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="px-4 pt-4 pb-6 max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-warm-steel mb-4 hover:text-deep-ink transition-colors">
        <ArrowLeft size={16} />返回
      </button>
      <h1 className="text-[1.5rem] font-bold text-deep-ink mb-6">AI 设置</h1>

      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">AI 模型设置</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-deep-ink mb-1.5">模型选择</label>
            <select value={modelProvider} onChange={(e) => setModelProvider(e.target.value)}
              className="w-full px-3 py-2.5 border border-scribe rounded-input bg-surface text-deep-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald appearance-none">
              <option value="deepseek">DeepSeek V4 Flash</option>
              <option value="zhipu">智谱 GLM-4V-Flash</option>
              <option value="qwen">通义千问 Qwen-VL-Plus</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-deep-ink mb-1.5">API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入 API Key..."
              className="w-full px-3 py-2.5 border border-scribe rounded-input bg-surface text-deep-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald font-mono" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={"w-2 h-2 rounded-full " + (apiKey ? "bg-emerald" : "bg-warm-steel")} />
            <span className="text-warm-steel">{apiKey ? "已配置" : "未配置"}</span>
          </div>
        </div>
      </section>

      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate">推理参数</h2>
          <button onClick={resetInference} className="flex items-center gap-1 text-xs text-faded-slate hover:text-warm-steel transition-colors">
            <RotateCcw size={12} /> 重置
          </button>
        </div>
        <div className="space-y-5">
          <RangeSlider label="温度 (Temperature)" value={inference.temperature}
            onChange={(v) => setInferenceParam("temperature", v)} min={0} max={2} step={0.05}
            labels={["精确", "平衡", "创意", "发散"]} formatValue={(v) => v.toFixed(2)} />
          <RangeSlider label="最大 Token (Max Tokens)" value={inference.maxTokens}
            onChange={(v) => setInferenceParam("maxTokens", v)} min={50} max={200} step={10}
            labels={["50", "100", "150", "200"]} formatValue={(v) => v.toString()} />
          <RangeSlider label="Top-P (核采样)" value={inference.topP}
            onChange={(v) => setInferenceParam("topP", v)} min={0} max={1} step={0.05}
            labels={["严格", "适中", "灵活", "多样"]} formatValue={(v) => v.toFixed(2)} />
        </div>
      </section>

      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">显示选项</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-deep-ink">AI 助手按钮</p>
            <p className="text-xs text-faded-slate mt-0.5">在首页底部显示 AI 助手浮动按钮</p>
          </div>
          <GlassSwitch
            value={showAIAssistant}
            onChange={setShowAIAssistant}
            ariaLabel="AI 助手按钮"
          />
        </div>
      </section>

    </motion.div>
  );
}
