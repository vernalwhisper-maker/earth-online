import { motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { getRarityLevel, getProbabilityText, getSeriesProgress } from "../../data/achievements";
import useAchievementStore from "../../store/achievementStore";
import AchievementIcon from "./AchievementIcon";

/**
 * 批量成就解锁弹窗。
 * - 根元素透传 motion props（由外层 motion.create(Component) + AnimatePresence 控制
 *   整体淡入淡出与退出卸载）
 * - 内部动画全部显式 initial/animate（不依赖 variants 传播），按钮始终可点
 */
export default function AchievementBatchModal({ achievements, onDismiss, onViewAll, ...motionProps }) {
  if (!achievements || achievements.length === 0) return null;

  const all = useAchievementStore((s) => s.achievements);

  return (
    <motion.div
      {...motionProps}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-auto"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-deep-ink/60 pointer-events-auto"
        onClick={onDismiss}
      />

      {/* Sheet — 自下而上滑入 */}
      <motion.div
        className="relative bg-surface rounded-[1.5rem] w-full max-w-[420px] mx-4 p-6 shadow-soft flex flex-col items-center gap-4 sm:mb-0 max-h-[80vh] pointer-events-auto"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22, mass: 0.8 }}
      >
        {/* Close button */}
        <motion.button
          onClick={onDismiss}
          whileTap={{ scale: 0.85 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas-warm pointer-events-auto"
        >
          <X size={18} className="text-warm-steel" />
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          className="flex flex-col items-center gap-2 mt-2"
        >
          <Sparkles size={24} className="text-emerald" />
          <span className="text-[0.75rem] font-bold uppercase tracking-[0.08em] text-emerald">
            成就解锁!
          </span>
          <h2 className="text-[1.25rem] font-bold text-deep-ink text-center">
            本次解锁了 {achievements.length} 个成就
          </h2>
        </motion.div>

        {/* Achievement grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.2 }}
          className="w-full flex-1 overflow-y-auto grid grid-cols-3 gap-3 py-2 px-1 scrollbar-none"
        >
          {achievements.map((a, i) => {
            const rarity = getRarityLevel(a.rarity);
            const probText = getProbabilityText(a.rarity);
            const series = getSeriesProgress(a.series, all);
            const isRare = typeof a.rarity === "number" ? a.rarity < 10 : parseFloat(a.rarity) < 10;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.2 + i * 0.05 }}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-canvas-warm transition-colors"
              >
                <div
                  className={`w-[52px] h-[52px] rounded-[1rem] overflow-hidden border-2 border-emerald/60 ${
                    isRare ? "shadow-[0_0_16px_rgba(51,144,236,0.25)]" : ""
                  }`}
                >
                  <AchievementIcon achievement={a} />
                </div>
                <span className="text-[0.625rem] text-deep-ink text-center leading-tight line-clamp-2">
                  {a.name}
                </span>
                {series && (
                  <span className="text-[0.5rem] text-warm-steel font-mono whitespace-nowrap">
                    {series.name}系列 {series.unlocked}/{series.total}
                  </span>
                )}
                {a.hidden && (
                  <span className="text-[0.5rem] text-amber-400 font-mono tracking-wider">✦ 隐藏成就</span>
                )}
                <span className={`text-[0.5rem] font-mono px-1.5 py-0.5 rounded-full ${rarity.color} opacity-80`}>
                  {rarity.label} {probText}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.3 }}
          className="w-full flex flex-col gap-2 pt-1"
        >
          <motion.button
            onClick={onDismiss}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="w-full py-2.5 bg-emerald text-white rounded-btn text-sm font-medium hover:bg-emerald-dark pointer-events-auto"
          >
            继续记录
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Confetti */}
      <Confetti />
    </motion.div>
  );
}

function Confetti() {
  const colors = ["#3390ec", "#f59e0b", "#8b5cf6", "#3b82f6", "#e11d48", "#ec4899", "#14b8a6"];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full pointer-events-none"
          style={{
            backgroundColor: colors[i % colors.length],
            left: `${5 + Math.random() * 90}%`,
            top: -10,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: ["0vh", "100vh"],
            opacity: [1, 0.6, 0],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
          }}
          transition={{
            duration: 1.8 + Math.random() * 2,
            delay: Math.random() * 0.6,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
