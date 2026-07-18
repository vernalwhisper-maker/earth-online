import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Loader, Sparkles, Hash, Trash2, Cpu, Wifi, Smartphone, FileText } from "lucide-react";
import useSettingsStore from "../../store/settingsStore";

const springPanel = { type: "spring", stiffness: 450, damping: 32, mass: 0.85 };

export default function TagResultSheet({ isOpen, mode, status, totalCount, tags, removedTag, aiMode, onClose }) {
  const isDark = useSettingsStore((s) => s.darkMode);
  const tabBarOpacity = useSettingsStore((s) => s.tabBarOpacity);

  const glassBg = isDark
    ? `linear-gradient(135deg, rgba(30,30,30,${tabBarOpacity / 85}) 0%, rgba(16,185,129,${tabBarOpacity / 500}) 40%, rgba(30,30,30,${tabBarOpacity / 75}) 100%)`
    : `linear-gradient(135deg, rgba(255,255,255,${tabBarOpacity / 90}) 0%, rgba(16,185,129,${tabBarOpacity / 600}) 40%, rgba(255,255,255,${tabBarOpacity / 130}) 100%)`;

  const isAutoTag = mode === "autoTag";
  const title = isAutoTag ? "量建标签" : "删标签";
  const headerIcon = isAutoTag ? Sparkles : Trash2;
  const HeaderIcon = headerIcon;

  // AI 模式对应的图标和标签
  const aiModeInfo = aiMode ? getAiModeInfo(aiMode) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 轻量遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-deep-ink/15 z-30"
            onClick={onClose}
          />

          {/* 玻璃面板 */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={springPanel}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2.5rem)] max-w-sm rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] overflow-hidden"
          >
            {/* 玻璃效果层 */}
            <div className="absolute inset-0"
              style={{ background: glassBg, backdropFilter: "blur(35px) saturate(200%)", WebkitBackdropFilter: "blur(35px) saturate(200%)" }} />
            <div className="absolute top-0 left-4 right-4 h-[1.5px]" style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.4)" }} />
            <div className="absolute inset-0 rounded-2xl border border-white/25" />
            <div className="absolute inset-[1px] rounded-2xl border border-white/70" />

            {/* 内容 */}
            <div className="relative z-10 px-5 py-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HeaderIcon size={15} className={isAutoTag ? "text-violet-500" : "text-rose"} />
                  <span className="text-sm font-semibold" style={{ color: isDark ? "rgba(240,238,235,0.95)" : "#1c1b1a" }}>
                    {title}
                  </span>
                </div>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors">
                  <X size={14} style={{ color: isDark ? "rgba(163,162,158,0.8)" : "rgba(107,106,103,0.7)" }} />
                </button>
              </div>

              {/* AI 模式指示器 */}
              {aiModeInfo && (
                <div className="flex items-center gap-1.5 mb-3 px-2 py-1 rounded-lg"
                  style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)" }}>
                  <aiModeInfo.icon size={11} style={{ color: aiModeInfo.color }} />
                  <span className="text-[11px] font-medium" style={{ color: aiModeInfo.color }}>
                    {aiModeInfo.label}
                  </span>
                </div>
              )}

              {/* Body — 量建标签 */}
              {isAutoTag && status === "processing" && (
                <div className="flex items-center gap-3 py-2">
                  <Loader size={18} className="text-violet-500 animate-spin shrink-0" />
                  <span className="text-sm" style={{ color: isDark ? "rgba(200,198,194,0.9)" : "rgba(107,106,103,0.9)" }}>
                    AI 正在逐条分析笔记...
                  </span>
                </div>
              )}
              {isAutoTag && status === "error" && (
                <div className="flex items-start gap-3 py-1">
                  <AlertCircle size={18} className="text-rose shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-rose">未能生成标签</p>
                    <p className="text-xs mt-1" style={{ color: isDark ? "rgba(163,162,158,0.8)" : "rgba(107,106,103,0.8)" }}>
                      请检查笔记内容是否完整，或确认 AI 配置是否正确
                    </p>
                  </div>
                </div>
              )}
              {isAutoTag && status === "success" && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-emerald/15 flex items-center justify-center shrink-0">
                      <CheckCircle size={18} className="text-emerald" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: isDark ? "rgba(240,238,235,0.95)" : "#1c1b1a" }}>
                        标签生成完成
                      </p>
                      <p className="text-xs" style={{ color: isDark ? "rgba(163,162,158,0.8)" : "rgba(107,106,103,0.8)" }}>
                        已为 <span className="font-semibold text-emerald">{totalCount}</span> 条笔记添加标签
                      </p>
                    </div>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {tags.map((tag) => (
                        <span key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: isDark ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.1)", color: isDark ? "rgba(196,181,253,0.95)" : "rgba(124,58,237,0.9)" }}>
                          <Hash size={9} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <button onClick={onClose} className="w-full py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{ background: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.15)", color: isDark ? "rgba(52,211,153,0.95)" : "rgba(4,120,87,0.95)" }}>
                    知道了
                  </button>
                </div>
              )}

              {/* Body — 删标签 */}
              {!isAutoTag && status === "success" && (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-rose/15 flex items-center justify-center shrink-0">
                      <Trash2 size={18} className="text-rose" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: isDark ? "rgba(240,238,235,0.95)" : "#1c1b1a" }}>
                        标签已移除
                      </p>
                      <p className="text-xs" style={{ color: isDark ? "rgba(163,162,158,0.8)" : "rgba(107,106,103,0.8)" }}>
                        已从 <span className="font-semibold text-rose">{totalCount}</span> 条笔记移除标签
                      </p>
                    </div>
                  </div>
                  {removedTag && (
                    <div className="flex justify-center mb-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{ background: isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.1)", color: isDark ? "rgba(252,165,165,0.95)" : "rgba(220,38,38,0.9)" }}>
                        <X size={10} />
                        {removedTag}
                      </span>
                    </div>
                  )}
                  <button onClick={onClose} className="w-full py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{ background: isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.1)", color: isDark ? "rgba(252,165,165,0.95)" : "rgba(220,38,38,0.9)" }}>
                    知道了
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function getAiModeInfo(aiMode) {
  if (aiMode.includes("Ollama")) {
    return { icon: Cpu, color: "#f59e0b", label: aiMode };
  }
  if (aiMode.includes("WebLLM")) {
    return { icon: Smartphone, color: "#8b5cf6", label: aiMode };
  }
  if (aiMode.includes("在线")) {
    return { icon: Wifi, color: "#3b82f6", label: aiMode };
  }
  return { icon: FileText, color: "#6b7280", label: aiMode };
}
