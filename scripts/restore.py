import os, re

base = "D:\\Codex\\New\\earth-online\\src"

# 1. Recreate RangeSlider.jsx (Claude-style)
with open(base + "\\components\\ui\\RangeSlider.jsx", "w", encoding="utf-8") as f:
    f.write("""import { useRef, useCallback } from "react";
import { motion } from "framer-motion";

const STATE_COLORS = {
  gray:   { text: "#8b949e", bg: "rgba(139,148,158,0.15)", fill: "rgba(139,148,158,0.4)" },
  amber:  { text: "#e3b341", bg: "rgba(227,179,65,0.15)",  fill: "rgba(227,179,65,0.6)" },
  orange: { text: "#f0883e", bg: "rgba(240,136,62,0.15)",  fill: "rgba(240,136,62,0.7)" },
  red:    { text: "#f04a3e", bg: "rgba(240,74,62,0.15)",   fill: "rgba(240,74,62,0.8)" },
};

var GRADIENT_COLORS = ["#8b949e", "#e3b341", "#f0883e", "#f04a3e"];

function getStateIndex(value, min, max) {
  var pct = (value - min) / (max - min);
  if (pct < 0.33) return 0;
  if (pct < 0.66) return 1;
  if (pct < 0.95) return 2;
  return 3;
}

function lerpColor(c1, c2, t) {
  var r1 = parseInt(c1.slice(1,3), 16), g1 = parseInt(c1.slice(3,5), 16), b1 = parseInt(c1.slice(5,7), 16);
  var r2 = parseInt(c2.slice(1,3), 16), g2 = parseInt(c2.slice(3,5), 16), b2 = parseInt(c2.slice(5,7), 16);
  var r = Math.round(r1 + (r2 - r1) * t);
  var g = Math.round(g1 + (g2 - g1) * t);
  var b = Math.round(b1 + (b2 - b1) * t);
  return "#" + [r,g,b].map(function(v) { return v.toString(16).padStart(2,"0"); }).join("");
}

function getFillColor(value, min, max) {
  var pct = (value - min) / (max - min);
  if (pct <= 0.33) return lerpColor(GRADIENT_COLORS[0], GRADIENT_COLORS[1], pct / 0.33);
  if (pct <= 0.66) return lerpColor(GRADIENT_COLORS[1], GRADIENT_COLORS[2], (pct - 0.33) / 0.33);
  if (pct <= 0.95) return lerpColor(GRADIENT_COLORS[2], GRADIENT_COLORS[3], (pct - 0.66) / 0.29);
  return GRADIENT_COLORS[3];
}

export default function RangeSlider(props) {
  var { label, value, onChange, min = 0, max = 1, step = 0.01, labels, formatValue } = props;
  var trackRef = useRef(null);
  var pct = ((value - min) / (max - min)) * 100;
  var clampedPct = Math.min(Math.max(pct, 0), 100);
  var stateIdx = getStateIndex(value, min, max);
  var fillColor = getFillColor(value, min, max);
  var allColors = [STATE_COLORS.gray, STATE_COLORS.amber, STATE_COLORS.orange, STATE_COLORS.red];
  var currentColor = allColors[stateIdx];
  var lbls = labels || ["\u4f4e", "\u4e2d", "\u9ad8", "\u6700\u9ad8"];
  var dotId = "dot-" + label.replace(/[\s()]/g, "");

  var handlePointerDown = useCallback(function(e) {
    e.preventDefault();
    var slider = trackRef.current && trackRef.current.closest("[data-slider]");
    if (!slider) return;
    var rect = slider.getBoundingClientRect();
    var raw = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    var val = Math.round((min + raw * (max - min)) / step) * step;
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
        {lbls.map(function(lbl, i) {
          var isActive = i === stateIdx;
          var c = isActive ? allColors[i] : STATE_COLORS.gray;
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
""")
print("RangeSlider.jsx recreated")

# 2. Add inference params back to settingsStore.js
with open(base + "\\store\\settingsStore.js", "r", encoding="utf-8") as f:
    ss = f.read()

# Add inference after loaded: false
ss = ss.replace(
    '"zhipu"',
    '"deepseek"'
)
ss = ss.replace(
    'loaded: false,\n',
    'loaded: false,\n  inference: { temperature: 0.3, maxTokens: 200, topP: 1.0 },\n'
)
ss = ss.replace(
    'setApiKey: async function(key) {\n      await setSetting("apiKey", key);\n      set({ apiKey: key });\n    },\n  }',
    'setApiKey: async function(key) {\n      await setSetting("apiKey", key);\n      set({ apiKey: key });\n    },\n\n    setInferenceParam: async function(key, value) {\n      var inf = get().inference;\n      var updated = { ...inf, [key]: value };\n      await setSetting("inference", updated);\n      set({ inference: updated });\n    },\n\n    resetInference: async function() {\n      var def = { temperature: 0.3, maxTokens: 200, topP: 1.0 };\n      await setSetting("inference", def);\n      set({ inference: def });\n    },\n  }'
)
# Update loadSettings to load inference
ss = ss.replace(
    'set({ modelProvider: provider, apiKey: apiKey, loaded: true });',
    'var inferenceRaw = await getSetting("inference");\n      var inference = inferenceRaw ? { temperature: 0.3, maxTokens: 200, topP: 1.0, ...inferenceRaw } : { temperature: 0.3, maxTokens: 200, topP: 1.0 };\n      set({ modelProvider: provider, apiKey: apiKey, inference: inference, loaded: true });'
)
# Fix object spread syntax (replace ... with Object.assign)
ss = ss.replace('{ temperature: 0.3, maxTokens: 200, topP: 1.0, ...inferenceRaw }', 'Object.assign({ temperature: 0.3, maxTokens: 200, topP: 1.0 }, inferenceRaw)')

# Note: we can't use object spread in the stored version. Let me check...
# Actually, the spread is in the original JSX which uses Babel. Let me check if the code works.
# The Object.assign approach is safer.

with open(base + "\\store\\settingsStore.js", "w", encoding="utf-8") as f:
    f.write(ss)
print("settingsStore.js inference params added")

# 3. Update NoteEditorPage.jsx - add inference
with open(base + "\\pages\\NoteEditorPage.jsx", "r", encoding="utf-8") as f:
    nep = f.read()

nep = nep.replace(
    "const { modelProvider, apiKey } = useSettingsStore();",
    "const { modelProvider, apiKey, inference } = useSettingsStore();"
)
nep = nep.replace(
    "const matchedIds = await matchAchievements(noteContent, apiKey, modelProvider);",
    "const matchedIds = await matchAchievements(noteContent, apiKey, modelProvider, inference);"
)

with open(base + "\\pages\\NoteEditorPage.jsx", "w", encoding="utf-8") as f:
    f.write(nep)
print("NoteEditorPage.jsx updated with inference")

# 4. Update SettingsPage.jsx - add DeepSeek, inference section, RangeSlider (no clear achievements)
with open(base + "\\pages\\SettingsPage.jsx", "r", encoding="utf-8") as f:
    sp = f.read()

# Add RangeSlider import
sp = sp.replace(
    'import { Download, Trash2, X } from "lucide-react";',
    'import { Download, Trash2, RotateCcw, X } from "lucide-react";'
)
sp = sp.replace(
    'import { exportAllNotes, clearAllData } from "../db";',
    'import { exportAllNotes, clearAllData } from "../db";\nimport RangeSlider from "../components/ui/RangeSlider";'
)

# Add inference to destructuring
sp = sp.replace(
    "const { modelProvider, apiKey, setModelProvider, setApiKey } =",
    "const { modelProvider, apiKey, inference, setModelProvider, setApiKey, setInferenceParam, resetInference } ="
)

# Add DeepSeek option
sp = sp.replace(
    '<option value="zhipu">\u667a\u8c31 GLM-4V-Flash</option>\n              <option value="qwen">\u901a\u4e49\u5343\u95ee Qwen-VL-Plus</option>',
    '<option value="deepseek">DeepSeek V4 Flash</option>\n              <option value="zhipu">\u667a\u8c31 GLM-4V-Flash</option>\n              <option value="qwen">\u901a\u4e49\u5343\u95ee Qwen-VL-Plus</option>'
)

# Add inference section BEFORE data management section
sp = sp.replace(
    '      {/* \u6570\u636e\u7ba1\u7406 */}',
    '''      {/* \u63a8\u7406\u53c2\u6570\u8bbe\u7f6e */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate">
            \u63a8\u7406\u53c2\u6570
          </h2>
          <button
            onClick={resetInference}
            className="flex items-center gap-1 text-xs text-faded-slate hover:text-warm-steel transition-colors"
          >
            <RotateCcw size={12} />
            \u91cd\u7f6e
          </button>
        </div>
        <div className="space-y-5">
          <RangeSlider
            label="\u6e29\u5ea6 (Temperature)"
            value={inference.temperature}
            onChange={(v) => setInferenceParam("temperature", v)}
            min={0}
            max={2}
            step={0.05}
            labels={["\u7cbe\u786e", "\u5e73\u8861", "\u521b\u610f", "\u53d1\u6563"]}
            formatValue={(v) => v.toFixed(2)}
          />
          <RangeSlider
            label="\u6700\u5927 Token (Max Tokens)"
            value={inference.maxTokens}
            onChange={(v) => setInferenceParam("maxTokens", v)}
            min={50}
            max={1000}
            step={10}
            labels={["50", "350", "700", "1000"]}
            formatValue={(v) => v.toString()}
          />
          <RangeSlider
            label="Top-P (\u6838\u91c7\u6837)"
            value={inference.topP}
            onChange={(v) => setInferenceParam("topP", v)}
            min={0}
            max={1}
            step={0.05}
            labels={["\u4e25\u683c", "\u9002\u4e2d", "\u7075\u6d3b", "\u591a\u6837"]}
            formatValue={(v) => v.toFixed(2)}
          />
        </div>
      </section>

      {/* \u6570\u636e\u7ba1\u7406 */}
      '''
)

with open(base + "\\pages\\SettingsPage.jsx", "w", encoding="utf-8") as f:
    f.write(sp)
print("SettingsPage.jsx updated")

print("\\nAll features restored except clear achievements!")
