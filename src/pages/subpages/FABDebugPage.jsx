import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bug, Sliders, RotateCcw, Plus, Sparkles } from "lucide-react";
import RangeSlider from "../../components/ui/RangeSlider";
import useSettingsStore from "../../store/settingsStore";
import { FAB_DEFAULTS, STORAGE_KEY_FAB } from "../../config/debugDefaults";

function loadParams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAB);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      blurPx: typeof parsed.blurPx === "number" ? parsed.blurPx : FAB_DEFAULTS.blurPx,
      saturation: typeof parsed.saturation === "number" ? parsed.saturation : FAB_DEFAULTS.saturation,
      bgOpacity: typeof parsed.bgOpacity === "number" ? parsed.bgOpacity : FAB_DEFAULTS.bgOpacity,
      borderOpacity: typeof parsed.borderOpacity === "number" ? parsed.borderOpacity : FAB_DEFAULTS.borderOpacity,
      shadowOpacity: typeof parsed.shadowOpacity === "number" ? parsed.shadowOpacity : FAB_DEFAULTS.shadowOpacity,
    };
  } catch { return null; }
}

function saveParams(params) {
  localStorage.setItem(STORAGE_KEY_FAB, JSON.stringify(params));
}

export default function FABDebugPage({ onBack }) {
  const { darkMode } = useSettingsStore();
  const saved = loadParams();
  const [blurPx, setBlurPx] = useState(saved?.blurPx ?? FAB_DEFAULTS.blurPx);
  const [saturation, setSaturation] = useState(saved?.saturation ?? FAB_DEFAULTS.saturation);
  const [bgOpacity, setBgOpacity] = useState(saved?.bgOpacity ?? FAB_DEFAULTS.bgOpacity);
  const [borderOpacity, setBorderOpacity] = useState(saved?.borderOpacity ?? FAB_DEFAULTS.borderOpacity);
  const [shadowOpacity, setShadowOpacity] = useState(saved?.shadowOpacity ?? FAB_DEFAULTS.shadowOpacity);

  useEffect(() => {
    const params = { blurPx, saturation, bgOpacity, borderOpacity, shadowOpacity };
    saveParams(params);
    window.dispatchEvent(new CustomEvent("earth-debug-fab-changed", { detail: params }));
  }, [blurPx, saturation, bgOpacity, borderOpacity, shadowOpacity]);

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY_FAB);
    setBlurPx(FAB_DEFAULTS.blurPx); setSaturation(FAB_DEFAULTS.saturation);
    setBgOpacity(FAB_DEFAULTS.bgOpacity); setBorderOpacity(FAB_DEFAULTS.borderOpacity);
    setShadowOpacity(FAB_DEFAULTS.shadowOpacity);
  };

  const glassStyle = {
    background: `rgba(255,255,255,${bgOpacity})`,
    backdropFilter: `blur(${blurPx}px) saturate(${saturation})`,
    WebkitBackdropFilter: `blur(${blurPx}px) saturate(${saturation})`,
    border: `1px solid rgba(255,255,255,${borderOpacity})`,
    boxShadow: `0 8px 32px rgba(0,0,0,${shadowOpacity}), inset 0 1px 0 rgba(255,255,255,0.12)`,
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="px-4 pt-4 pb-20 max-w-2xl mx-auto">
      <button onClick={() => onBack?.("more")} className="flex items-center gap-1.5 text-sm text-warm-steel mb-4 hover:text-deep-ink transition-colors">
        <ArrowLeft size={16} />返回更多设置
      </button>
      <h1 className="flex items-center gap-2 text-[1.5rem] font-bold text-deep-ink mb-6">
        <Bug size={22} />新建/AI按钮调试
      </h1>

      {/* 实时预览 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">实时预览</h2>
        <div className="flex items-center justify-center gap-8 py-8 rounded-xl"
          style={{ background: `url("/测试专用.png") center/cover no-repeat, ${darkMode ? "#1c1b1a" : "#f0efec"}`, minHeight: 120 }}>
          <button className="w-14 h-14 rounded-full flex items-center justify-center cursor-default" style={glassStyle}>
            <Plus size={22} className="text-warm-steel" />
          </button>
          <button className="w-14 h-14 rounded-full flex items-center justify-center cursor-default" style={glassStyle}>
            <Sparkles size={20} className="text-warm-steel" />
          </button>
        </div>
      </section>

      {/* 参数控制 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-faded-slate"><Sliders size={14} />参数控制</h2>
          <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose bg-rose/10 rounded-full hover:bg-rose/20 transition-colors"><RotateCcw size={12} />恢复默认</button>
        </div>
        <div className="space-y-4">
          <RangeSlider label="模糊量" value={blurPx} onChange={(v) => setBlurPx(v)} min={0} max={60} step={2} formatValue={(v) => v + "px"} labels={["清晰", "轻", "中", "重"]} />
          <RangeSlider label="饱和度" value={saturation} onChange={(v) => setSaturation(v)} min={0} max={3} step={0.1} formatValue={(v) => v.toFixed(1)} labels={["灰", "低", "中", "高"]} />
          <RangeSlider label="背景透明度" value={bgOpacity} onChange={(v) => setBgOpacity(v)} min={0} max={0.5} step={0.02} formatValue={(v) => Math.round(v * 100) + "%"} labels={["透明", "轻", "中", "重"]} />
          <RangeSlider label="边框透明度" value={borderOpacity} onChange={(v) => setBorderOpacity(v)} min={0} max={0.5} step={0.02} formatValue={(v) => Math.round(v * 100) + "%"} labels={["无", "轻", "中", "重"]} />
          <RangeSlider label="阴影强度" value={shadowOpacity} onChange={(v) => setShadowOpacity(v)} min={0} max={1} step={0.05} formatValue={(v) => v.toFixed(2)} labels={["无阴影", "轻", "中", "重"]} />
        </div>
      </section>
    </motion.div>
  );
}
