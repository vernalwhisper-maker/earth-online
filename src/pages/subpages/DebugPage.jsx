import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bug, Sliders, RotateCcw } from "lucide-react";
import RangeSlider from "../../components/ui/RangeSlider";
import LiquidGlass from "../../components/ui/LiquidGlass/index";
import useSettingsStore from "../../store/settingsStore";
import { DEBUG_DEFAULTS, MODE_OPTIONS, STORAGE_KEY_SEGMENTED } from "../../config/debugDefaults";

/** 安全读取 localStorage 参数，字段缺失/类型错误自动补齐默认值 */
function loadParams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEGMENTED);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      elasticity:    typeof parsed.elasticity    === "number"  ? parsed.elasticity    : DEBUG_DEFAULTS.elasticity,
      blurAmount:    typeof parsed.blurAmount    === "number"  ? parsed.blurAmount    : DEBUG_DEFAULTS.blurAmount,
      saturation:    typeof parsed.saturation    === "number"  ? parsed.saturation    : DEBUG_DEFAULTS.saturation,
      displacementScale: typeof parsed.displacementScale === "number" ? parsed.displacementScale : DEBUG_DEFAULTS.displacementScale,
      aberrationIntensity: typeof parsed.aberrationIntensity === "number" ? parsed.aberrationIntensity : DEBUG_DEFAULTS.aberrationIntensity,
      cornerRadius:  typeof parsed.cornerRadius  === "number"  ? parsed.cornerRadius  : DEBUG_DEFAULTS.cornerRadius,
      modeIdx:       typeof parsed.modeIdx       === "number"  ? parsed.modeIdx       : DEBUG_DEFAULTS.modeIdx,
      overLight:     typeof parsed.overLight     === "boolean" ? parsed.overLight     : DEBUG_DEFAULTS.overLight,
      shadowOpacity: typeof parsed.shadowOpacity === "number"  ? parsed.shadowOpacity : DEBUG_DEFAULTS.shadowOpacity,
    };
  } catch { return null; }
}

function saveParams(params) {
  localStorage.setItem(STORAGE_KEY_SEGMENTED, JSON.stringify(params));
}

export default function DebugPage({ onBack }) {
  const { darkMode } = useSettingsStore();
  const saved = loadParams();

  const [elasticity, setElasticity] = useState(saved?.elasticity ?? DEBUG_DEFAULTS.elasticity);
  const [blurAmount, setBlurAmount] = useState(saved?.blurAmount ?? DEBUG_DEFAULTS.blurAmount);
  const [saturation, setSaturation] = useState(saved?.saturation ?? DEBUG_DEFAULTS.saturation);
  const [displacementScale, setDisplacementScale] = useState(saved?.displacementScale ?? DEBUG_DEFAULTS.displacementScale);
  const [aberrationIntensity, setAberrationIntensity] = useState(saved?.aberrationIntensity ?? DEBUG_DEFAULTS.aberrationIntensity);
  const [cornerRadius, setCornerRadius] = useState(saved?.cornerRadius ?? DEBUG_DEFAULTS.cornerRadius);
  const [modeIdx, setModeIdx] = useState(saved?.modeIdx ?? DEBUG_DEFAULTS.modeIdx);
  const [overLight, setOverLight] = useState(saved?.overLight ?? DEBUG_DEFAULTS.overLight);
  const [shadowOpacity, setShadowOpacity] = useState(saved?.shadowOpacity ?? DEBUG_DEFAULTS.shadowOpacity);

  const mode = MODE_OPTIONS[modeIdx];

  // 每次参数变化自动保存 + 通知 App.jsx 实时生效
  useEffect(() => {
    const params = { elasticity, blurAmount, saturation, displacementScale, aberrationIntensity, cornerRadius, modeIdx, overLight, shadowOpacity };
    saveParams(params);
    window.dispatchEvent(new CustomEvent("earth-debug-segmented-changed", { detail: params }));
  }, [elasticity, blurAmount, saturation, displacementScale, aberrationIntensity, cornerRadius, modeIdx, overLight, shadowOpacity]);

  // 恢复默认
  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY_SEGMENTED);
    setElasticity(DEBUG_DEFAULTS.elasticity);
    setBlurAmount(DEBUG_DEFAULTS.blurAmount);
    setSaturation(DEBUG_DEFAULTS.saturation);
    setDisplacementScale(DEBUG_DEFAULTS.displacementScale);
    setAberrationIntensity(DEBUG_DEFAULTS.aberrationIntensity);
    setCornerRadius(DEBUG_DEFAULTS.cornerRadius);
    setModeIdx(DEBUG_DEFAULTS.modeIdx);
    setOverLight(DEBUG_DEFAULTS.overLight);
    setShadowOpacity(DEBUG_DEFAULTS.shadowOpacity);
  };

  const isDarkPreview = darkMode || !overLight;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="px-4 pt-4 pb-20 max-w-2xl mx-auto">
      <button onClick={() => onBack?.("more")} className="flex items-center gap-1.5 text-sm text-warm-steel mb-4 hover:text-deep-ink transition-colors">
        <ArrowLeft size={16} />返回更多设置
      </button>
      <h1 className="flex items-center gap-2 text-[1.5rem] font-bold text-deep-ink mb-6">
        <Bug size={22} />表/类/夹调试
      </h1>

      {/* 实时预览 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4 overflow-hidden">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">实时预览</h2>
        <div className="flex items-center justify-center gap-10 py-6 rounded-xl"
          style={{
            background: `url("/测试专用.png") center/cover no-repeat, ${isDarkPreview ? "#1c1b1a" : "#f0efec"}`,
            minHeight: 100,
          }}>
          {/* 实验区预览 — 列表/分类/文件夹 切换栏 */}
          <LiquidGlass
            cornerRadius={cornerRadius}
            padding="4px"
            elasticity={elasticity}
            blurAmount={blurAmount}
            saturation={saturation}
            displacementScale={displacementScale}
            aberrationIntensity={aberrationIntensity}
            mode={mode}
            overLight={!isDarkPreview}
            shadowOpacity={shadowOpacity}
            wrapperStyle={{}}
          >
            <div className="flex gap-1 rounded-full p-0.5">
              {["列表", "分类", "文件夹"].map((label, i) => (
                <span key={label}
                  className={"px-2.5 py-1 text-xs rounded-full " + (i === 0 ? "bg-white text-deep-ink shadow-sm" : "text-faded-slate")}>
                  {label}
                </span>
              ))}
            </div>
          </LiquidGlass>
        </div>
      </section>

      {/* 参数控制 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-faded-slate">
            <Sliders size={14} />参数控制
          </h2>
          <button onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose bg-rose/10 rounded-full hover:bg-rose/20 transition-colors">
            <RotateCcw size={12} />恢复默认
          </button>
        </div>
        <div className="space-y-4">
          <RangeSlider label="弹性系数" value={Math.round(elasticity * 1000) / 1000}
            onChange={(v) => setElasticity(v)} min={0} max={0.5} step={0.01}
            formatValue={(v) => v.toFixed(2)} />
          <RangeSlider label="模糊量" value={blurAmount}
            onChange={(v) => setBlurAmount(v)} min={0} max={0.5} step={0.01}
            formatValue={(v) => (4 + v * 32).toFixed(0) + "px"} />
          <RangeSlider label="饱和度" value={saturation}
            onChange={(v) => setSaturation(v)} min={100} max={300} step={10}
            formatValue={(v) => v + "%"} />
          <RangeSlider label="色散强度" value={displacementScale}
            onChange={(v) => setDisplacementScale(v)} min={10} max={150} step={5} />
          <RangeSlider label="通道分离" value={aberrationIntensity}
            onChange={(v) => setAberrationIntensity(v)} min={0} max={8} step={0.5}
            formatValue={(v) => v.toFixed(1)} />
          <RangeSlider label="圆角" value={cornerRadius}
            onChange={(v) => setCornerRadius(v)} min={0} max={999} step={4}
            labels={["直角", "小圆角", "大圆角", "圆形"]} />

          <div className="flex items-center justify-between px-2 py-2">
            <span className="text-sm text-deep-ink">折射模式</span>
            <div className="flex gap-1">
              {MODE_OPTIONS.map((m, i) => (
                <button key={m}
                  onClick={() => setModeIdx(i)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${i === modeIdx ? "bg-emerald text-white" : "bg-canvas-warm text-warm-steel"}`}>
                  {m === "standard" ? "标准" : m === "polar" ? "极性" : m === "prominent" ? "显著" : "着色"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between px-2 py-2">
            <span className="text-sm text-deep-ink">浅色背景模式</span>
            <button onClick={() => setOverLight(!overLight)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${overLight ? "bg-emerald text-white" : "bg-canvas-warm text-warm-steel"}`}>
              {overLight ? "开启" : "关闭"}
            </button>
          </div>

          <RangeSlider label="阴影强度" value={shadowOpacity}
            onChange={(v) => setShadowOpacity(v)} min={0} max={1} step={0.05}
            formatValue={(v) => v.toFixed(2)}
            labels={["无阴影", "轻", "中", "重"]} />
        </div>
      </section>
    </motion.div>
  );
}
