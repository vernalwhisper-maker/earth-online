import { motion } from "framer-motion";
import { Square, Grid3x3, CircleDot, AlignJustify, Star, Sparkles, Minus, Droplets } from "lucide-react";
import { BG_PATTERNS, BG_THEMES, ANIM_THEMES } from "../../data/themeTypes";

const PATTERN_ICONS = { solid: Square, grid: Grid3x3, dot: CircleDot, lined: AlignJustify };
const ANIM_ICONS = { none: Minus, starry: Star, float: Sparkles, shimmer: Droplets };

export default function BackgroundSelector({ bgColorId, bgPattern, animTheme, onColorChange, onPatternChange, onAnimChange }) {
  const currentTheme = BG_THEMES.find((t) => t.id === bgColorId) || BG_THEMES[0];
  const isDark = bgColorId === 6;

  return (
    <div className="space-y-4">
      {/* 背景颜色 */}
      <div>
        <label className="text-xs font-mono text-faded-slate mb-2 block">背景颜色</label>
        <div className="flex gap-2 flex-wrap">
          {BG_THEMES.map((t) => (
            <button key={t.id} onClick={() => onColorChange(t.id)}
              className={"w-8 h-8 rounded-full transition-all border-2 shadow-sm " +
                (bgColorId === t.id ? "border-emerald scale-110 ring-2 ring-emerald/30" : "border-transparent hover:scale-105")}
              style={{ backgroundColor: t.color }}
              title={t.label} />
          ))}
        </div>
      </div>

      {/* 背景图案 */}
      <div>
        <label className="text-xs font-mono text-faded-slate mb-2 block">背景图案</label>
        <div className="flex gap-2">
          {BG_PATTERNS.map((p) => {
            const Icon = PATTERN_ICONS[p.id] || Square;
            const isActive = bgPattern === p.id;
            return (
              <button key={p.id} onClick={() => onPatternChange(p.id)}
                className={"flex flex-col items-center gap-1 px-3 py-2 rounded-btn border transition-all text-xs " +
                  (isActive
                    ? "border-emerald bg-emerald/5 text-emerald"
                    : "border-scribe text-faded-slate hover:text-deep-ink hover:border-scribe/80")}>
                <Icon size={16} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
        {/* 图案预览小窗 */}
        <div className="mt-2 h-12 rounded-card border border-scribe overflow-hidden"
          style={{ backgroundColor: currentTheme.color }}>
          <div className={"w-full h-full " + (bgPattern !== "solid" ? "bg-pattern-" + bgPattern + (isDark ? " bg-pattern-dark" : "") : "")} />
        </div>
      </div>

      {/* 动效主题 */}
      <div>
        <label className="text-xs font-mono text-faded-slate mb-2 block">环境动效</label>
        <div className="flex gap-2">
          {ANIM_THEMES.map((a) => {
            const Icon = ANIM_ICONS[a.id] || Minus;
            const isActive = animTheme === a.id;
            return (
              <button key={a.id} onClick={() => onAnimChange(a.id)}
                className={"flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-btn border transition-all text-xs " +
                  (isActive
                    ? "border-emerald bg-emerald/5 text-emerald"
                    : "border-scribe text-faded-slate hover:text-deep-ink")}>
                <Icon size={16} />
                <span>{a.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[0.65rem] text-faded-slate mt-1.5">
          动效仅编辑时可见，不影响笔记内容
        </p>
      </div>
    </div>
  );
}
