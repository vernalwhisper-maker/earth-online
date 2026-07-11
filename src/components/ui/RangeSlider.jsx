import { useRef, useCallback } from "react";
import { motion } from "framer-motion";

const STATE_COLORS = {
  gray:   { text: "#8b949e", bg: "rgba(139,148,158,0.15)", fill: "rgba(139,148,158,0.4)" },
  amber:  { text: "#e3b341", bg: "rgba(227,179,65,0.15)",  fill: "rgba(227,179,65,0.6)" },
  orange: { text: "#f0883e", bg: "rgba(240,136,62,0.15)",  fill: "rgba(240,136,62,0.7)" },
  red:    { text: "#f04a3e", bg: "rgba(240,74,62,0.15)",   fill: "rgba(240,74,62,0.8)" },
};

const GRADIENT_COLORS = ["#8b949e", "#e3b341", "#f0883e", "#f04a3e"];

function getStateIndex(value, min, max) {
  const pct = (value - min) / (max - min);
  if (pct < 0.33) return 0;
  if (pct < 0.66) return 1;
  if (pct < 0.95) return 2;
  return 3;
}

function lerpColor(c1, c2, t) {
  const r1 = parseInt(c1.slice(1,3), 16), g1 = parseInt(c1.slice(3,5), 16), b1 = parseInt(c1.slice(5,7), 16);
  const r2 = parseInt(c2.slice(1,3), 16), g2 = parseInt(c2.slice(3,5), 16), b2 = parseInt(c2.slice(5,7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return "#" + [r,g,b].map((v) => v.toString(16).padStart(2, '0')).join("");
}

function getFillColor(value, min, max) {
  const pct = (value - min) / (max - min);
  if (pct <= 0.33) return lerpColor(GRADIENT_COLORS[0], GRADIENT_COLORS[1], pct / 0.33);
  if (pct <= 0.66) return lerpColor(GRADIENT_COLORS[1], GRADIENT_COLORS[2], (pct - 0.33) / 0.33);
  if (pct <= 0.95) return lerpColor(GRADIENT_COLORS[2], GRADIENT_COLORS[3], (pct - 0.66) / 0.29);
  return GRADIENT_COLORS[3];
}

export default function RangeSlider(props) {
  const { label, value, onChange, min = 0, max = 1, step = 0.01, labels, formatValue } = props;
  const trackRef = useRef(null);
  const pct = ((value - min) / (max - min)) * 100;
  const clampedPct = Math.min(Math.max(pct, 0), 100);
  const stateIdx = getStateIndex(value, min, max);
  const fillColor = getFillColor(value, min, max);
  const allColors = [STATE_COLORS.gray, STATE_COLORS.amber, STATE_COLORS.orange, STATE_COLORS.red];
  const currentColor = allColors[stateIdx];
  const lbls = labels || ["低", "中", "高", "最高"];
  const dotId = "dot-" + label.replace(/[\s()]/g, "");

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    const slider = trackRef.current && trackRef.current.closest("[data-slider]");
    if (!slider) return;
    const rect = slider.getBoundingClientRect();
    const raw = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const val = Math.round((min + raw * (max - min)) / step) * step;
    onChange(Math.min(Math.max(val, min), max));
  }, [min, max, step, onChange]);

  return (
    <div data-slider className="select-none pt-2 pb-1" onPointerDown={handlePointerDown} style={{ touchAction: "none" }}>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-deep-ink">{label}</label>
        {formatValue != null && formatValue(value) != null && (
          <span className="text-xs font-mono tabular-nums" style={{ color: currentColor.text }}>
            {formatValue(value)}
          </span>
        )}
      </div>
      <div ref={trackRef} className="relative h-6 flex items-center cursor-pointer">
        <div className="absolute left-0 right-0 h-[5px] rounded-full" style={{ backgroundColor: "rgba(139,148,158,0.15)" }} />
        <div className="absolute left-0 h-[5px] rounded-full transition-all duration-100 ease-out" style={{ width: clampedPct + "%", backgroundColor: fillColor }} />
        <div className="absolute pointer-events-none transition-all duration-100 ease-out" style={{
          width: "28px", height: "28px", borderRadius: "50%",
          left: "calc(" + clampedPct + "% - 14px)",
          top: "50%", transform: "translateY(-50%)",
          background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)",
          opacity: 0.6
        }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white cursor-grab active:cursor-grabbing z-10 transition-shadow duration-100" style={{
          left: "calc(" + clampedPct + "% - 10px)",
          boxShadow: "0 2px 6px " + fillColor + "80, 0 0 0 1px " + fillColor + "40"
        }} />
      </div>
      <div className="flex justify-between mt-3 px-0">
        {lbls.map((lbl, i) => {
          const isActive = i === stateIdx;
          const c = isActive ? allColors[i] : STATE_COLORS.gray;
          return (
            <div key={i} className="flex flex-col items-center gap-1" style={{ minWidth: "40px" }}>
              {isActive ? (
                <motion.div layoutId={dotId} className="w-1 h-1 rounded-full" style={{ backgroundColor: c.text }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }} />
              ) : (
                <div className="w-1 h-1" />
              )}
              <span className="text-[11px] font-medium transition-colors duration-150"
                style={{ color: isActive ? c.text : "rgba(139,148,158,0.5)" }}>{lbl}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
