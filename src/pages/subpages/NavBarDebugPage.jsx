import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bug, Sliders, RotateCcw, FileText, Trophy, Settings } from "lucide-react";
import RangeSlider from "../../components/ui/RangeSlider";
import useSettingsStore from "../../store/settingsStore";
import { NAVBAR_DEFAULTS, STORAGE_KEY_NAVBAR } from "../../config/debugDefaults";

function loadParams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NAVBAR);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      blurPx: typeof parsed.blurPx === "number" ? parsed.blurPx : NAVBAR_DEFAULTS.blurPx,
      saturation: typeof parsed.saturation === "number" ? parsed.saturation : NAVBAR_DEFAULTS.saturation,
      bgOpacity: typeof parsed.bgOpacity === "number" ? parsed.bgOpacity : NAVBAR_DEFAULTS.bgOpacity,
      borderOpacity: typeof parsed.borderOpacity === "number" ? parsed.borderOpacity : NAVBAR_DEFAULTS.borderOpacity,
      shadowOpacity: typeof parsed.shadowOpacity === "number" ? parsed.shadowOpacity : NAVBAR_DEFAULTS.shadowOpacity,
      borderRadius: typeof parsed.borderRadius === "number" ? parsed.borderRadius : NAVBAR_DEFAULTS.borderRadius,
    };
  } catch { return null; }
}

function saveParams(params) {
  localStorage.setItem(STORAGE_KEY_NAVBAR, JSON.stringify(params));
}

const tabs = [
  { label: "笔记", icon: FileText },
  { label: "成就", icon: Trophy },
  { label: "设置", icon: Settings },
];

export default function NavBarDebugPage({ onBack }) {
  const { darkMode } = useSettingsStore();
  const saved = loadParams();
  const [blurPx, setBlurPx] = useState(saved?.blurPx ?? NAVBAR_DEFAULTS.blurPx);
  const [saturation, setSaturation] = useState(saved?.saturation ?? NAVBAR_DEFAULTS.saturation);
  const [bgOpacity, setBgOpacity] = useState(saved?.bgOpacity ?? NAVBAR_DEFAULTS.bgOpacity);
  const [borderOpacity, setBorderOpacity] = useState(saved?.borderOpacity ?? NAVBAR_DEFAULTS.borderOpacity);
  const [shadowOpacity, setShadowOpacity] = useState(saved?.shadowOpacity ?? NAVBAR_DEFAULTS.shadowOpacity);
  const [borderRadius, setBorderRadius] = useState(saved?.borderRadius ?? NAVBAR_DEFAULTS.borderRadius);

  useEffect(() => {
    const params = { blurPx, saturation, bgOpacity, borderOpacity, shadowOpacity, borderRadius };
    saveParams(params);
    window.dispatchEvent(new CustomEvent("earth-debug-navbar-changed", { detail: params }));
  }, [blurPx, saturation, bgOpacity, borderOpacity, shadowOpacity, borderRadius]);

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY_NAVBAR);
    setBlurPx(NAVBAR_DEFAULTS.blurPx); setSaturation(NAVBAR_DEFAULTS.saturation);
    setBgOpacity(NAVBAR_DEFAULTS.bgOpacity); setBorderOpacity(NAVBAR_DEFAULTS.borderOpacity);
    setShadowOpacity(NAVBAR_DEFAULTS.shadowOpacity); setBorderRadius(NAVBAR_DEFAULTS.borderRadius);
  };

  const glassStyle = {
    background: `rgba(255,255,255,${bgOpacity})`,
    backdropFilter: `blur(${blurPx}px) saturate(${saturation})`,
    WebkitBackdropFilter: `blur(${blurPx}px) saturate(${saturation})`,
    border: `1px solid rgba(255,255,255,${borderOpacity})`,
    boxShadow: `0 8px 32px rgba(0,0,0,${shadowOpacity}), inset 0 1px 0 rgba(255,255,255,0.12)`,
    borderRadius,
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="px-4 pt-4 pb-20 max-w-2xl mx-auto">
      <button onClick={() => onBack?.("more")} className="flex items-center gap-1.5 text-sm text-warm-steel mb-4 hover:text-deep-ink transition-colors">
        <ArrowLeft size={16} />返回更多设置
      </button>
      <h1 className="flex items-center gap-2 text-[1.5rem] font-bold text-deep-ink mb-6">
        <Bug size={22} />导航栏调试
      </h1>

      {/* 实时预览 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">实时预览</h2>
        <div className="flex items-center justify-center py-6 rounded-xl"
          style={{ background: `url("/测试专用.png") center/cover no-repeat, ${darkMode ? "#1c1b1a" : "#f0efec"}` }}>
          <div className="flex items-center gap-1 px-2 py-1.5" style={glassStyle}>
            {tabs.map((tab, i) => {
              const Icon = tab.icon;
              return (
                <span key={tab.label} className="flex flex-col items-center gap-0.5 py-1.5 px-5">
                  <Icon size={18} className={i === 0 ? "text-emerald" : "text-faded-slate"} />
                  <span className="text-[10px] font-semibold">{tab.label}</span>
                </span>
              );
            })}
          </div>
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
          <RangeSlider label="圆角" value={borderRadius} onChange={(v) => setBorderRadius(v)} min={0} max={40} step={2} formatValue={(v) => v + "px"} labels={["直角", "小圆角", "大圆角", "超圆"]} />
        </div>
      </section>
    </motion.div>
  );
}
