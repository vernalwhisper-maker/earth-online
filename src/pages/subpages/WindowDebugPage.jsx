import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bug, Sliders, RotateCcw, X, Hash, Palette } from "lucide-react";
import RangeSlider from "../../components/ui/RangeSlider";
import useSettingsStore from "../../store/settingsStore";
import { WINDOW_DEFAULTS, STORAGE_KEY_WINDOW } from "../../config/debugDefaults";

function loadParams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WINDOW);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      blurPx: typeof parsed.blurPx === "number" ? parsed.blurPx : WINDOW_DEFAULTS.blurPx,
      saturation: typeof parsed.saturation === "number" ? parsed.saturation : WINDOW_DEFAULTS.saturation,
      bgOpacity: typeof parsed.bgOpacity === "number" ? parsed.bgOpacity : WINDOW_DEFAULTS.bgOpacity,
      borderOpacity: typeof parsed.borderOpacity === "number" ? parsed.borderOpacity : WINDOW_DEFAULTS.borderOpacity,
      shadowOpacity: typeof parsed.shadowOpacity === "number" ? parsed.shadowOpacity : WINDOW_DEFAULTS.shadowOpacity,
    };
  } catch { return null; }
}

function saveParams(params) {
  localStorage.setItem(STORAGE_KEY_WINDOW, JSON.stringify(params));
}

export default function WindowDebugPage({ onBack }) {
  const { darkMode: dm } = useSettingsStore();
  const isDark = dm === "dark" || (dm === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const saved = loadParams();
  const [blurPx, setBlurPx] = useState(saved?.blurPx ?? WINDOW_DEFAULTS.blurPx);
  const [saturation, setSaturation] = useState(saved?.saturation ?? WINDOW_DEFAULTS.saturation);
  const [bgOpacity, setBgOpacity] = useState(saved?.bgOpacity ?? WINDOW_DEFAULTS.bgOpacity);
  const [borderOpacity, setBorderOpacity] = useState(saved?.borderOpacity ?? WINDOW_DEFAULTS.borderOpacity);
  const [shadowOpacity, setShadowOpacity] = useState(saved?.shadowOpacity ?? WINDOW_DEFAULTS.shadowOpacity);

  useEffect(() => {
    const params = { blurPx, saturation, bgOpacity, borderOpacity, shadowOpacity };
    saveParams(params);
    window.dispatchEvent(new CustomEvent("earth-debug-window-changed", { detail: params }));
  }, [blurPx, saturation, bgOpacity, borderOpacity, shadowOpacity]);

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY_WINDOW);
    setBlurPx(WINDOW_DEFAULTS.blurPx); setSaturation(WINDOW_DEFAULTS.saturation);
    setBgOpacity(WINDOW_DEFAULTS.bgOpacity); setBorderOpacity(WINDOW_DEFAULTS.borderOpacity);
    setShadowOpacity(WINDOW_DEFAULTS.shadowOpacity);
  };

  const windowStyle = {
    background: `rgba(255,255,255,${bgOpacity})`,
    backdropFilter: `blur(${blurPx}px) saturate(${saturation})`,
    WebkitBackdropFilter: `blur(${blurPx}px) saturate(${saturation})`,
    border: `1px solid rgba(255,255,255,${borderOpacity})`,
    boxShadow: `0 8px 40px rgba(0,0,0,${shadowOpacity})`,
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="px-4 pt-4 pb-20 max-w-2xl mx-auto">
      <button onClick={() => onBack?.("more")} className="flex items-center gap-1.5 text-sm text-warm-steel mb-4 hover:text-deep-ink transition-colors">
        <ArrowLeft size={16} />返回更多设置
      </button>
      <h1 className="flex items-center gap-2 text-[1.5rem] font-bold text-deep-ink mb-6">
        <Bug size={22} />窗口调试
      </h1>

      {/* 实时预览 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">实时预览</h2>
        <div className="flex items-center justify-center py-10 rounded-xl"
          style={{ background: `url("/测试专用.png") center/cover no-repeat, ${isDark ? "#1c1b1a" : "#f0efec"}`, minHeight: 160 }}>
          {/* 模拟窗口卡片 */}
          <motion.div
            className="relative w-[200px] rounded-[1.5rem] overflow-hidden"
            style={windowStyle}
          >
            {/* 顶部高光 */}
            <div className="absolute top-0 left-4 right-4 h-[1.5px]" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)" }} />
            {/* 外层边框 */}
            <div className="absolute inset-0 rounded-[1.5rem] border" style={{ borderColor: `rgba(255,255,255,${borderOpacity})` }} />
            {/* 内层边框 */}
            <div className="absolute inset-[1px] rounded-[1.5rem] border" style={{ borderColor: `rgba(255,255,255,${Math.min(borderOpacity + 0.3, 0.9)})` }} />
            {/* 内容 */}
            <div className="relative z-10 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-deep-ink">窗口标题</span>
                <X size={14} className="text-faded-slate" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5">
                  <Hash size={14} className="text-faded-slate" />
                  <span className="text-xs text-deep-ink">标签管理</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5">
                  <Palette size={14} className="text-faded-slate" />
                  <span className="text-xs text-deep-ink">更多设置</span>
                </div>
              </div>
            </div>
          </motion.div>
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
