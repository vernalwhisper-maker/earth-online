import { motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { getRarityLevel, getIconFilename } from "../../data/achievements";

/**
 * 成就解锁弹窗。
 * - 根元素透传 motion props（由外层 motion.create(UnlockModal) + AnimatePresence 控制
 *   整体淡入淡出与退出卸载，退出完成即卸载，不会残留全屏遮罩拦截点击）
 * - 内部所有动画均使用显式 initial/animate（不依赖 variants 传播），
 *   保证按钮始终可见可点，同时保留卡片滑入 / 内容交错 / 按压反馈全部效果
 */
export default function UnlockModal({ achievement, onDismiss, onViewAll, ...motionProps }) {
  if (!achievement) return null;

  const rarity = getRarityLevel(achievement.rarity);
  const iconFile = getIconFilename(achievement.id);
  const isRare = achievement.rarity < 10;

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

      {/* Card — 自下而上滑入 */}
      <motion.div
        className="relative bg-surface rounded-[1.5rem] w-full max-w-[420px] mx-4 p-8 shadow-soft flex flex-col items-center gap-5 sm:mb-0 pointer-events-auto"
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

        <div className="flex flex-col items-center gap-5 w-full">
          {/* Sparkle icon */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.2 }}
          >
            <Sparkles size={24} className="text-emerald" />
          </motion.div>

          {/* Achievement icon */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.25 }}
            className={`w-[72px] h-[72px] rounded-[1.25rem] overflow-hidden border-2 border-emerald ${
              isRare ? "shadow-[0_0_24px_rgba(51,144,236,0.3)]" : ""
            }`}
          >
            <img
              src={`/icons/${iconFile}`}
              alt={achievement.name}
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Label */}
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.3 }}
            className="text-[0.75rem] font-bold uppercase tracking-[0.08em] text-emerald"
          >
            成就解锁!
          </motion.span>

          {/* Name */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.35 }}
            className="text-[1.75rem] sm:text-[2rem] font-extrabold text-deep-ink text-center leading-tight"
          >
            {achievement.name}
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.4 }}
            className="text-[0.9375rem] text-warm-steel text-center leading-relaxed"
          >
            {achievement.description}
          </motion.p>

          {/* Rarity badge */}
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.45 }}
            className={`inline-block px-3 py-1 rounded-full text-[0.75rem] font-mono uppercase ${rarity.color}`}
          >
            {rarity.label} · 仅 {achievement.rarity}% 的玩家拥有
          </motion.span>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.5 }}
            className="w-full flex flex-col gap-2 mt-2"
          >
            <motion.button
              onClick={onDismiss}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="w-full py-2.5 bg-emerald text-white rounded-btn text-sm font-medium hover:bg-emerald-dark pointer-events-auto"
            >
              继续记录
            </motion.button>
            <motion.button
              onClick={onViewAll}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="w-full py-2.5 border border-scribe text-warm-steel rounded-btn text-sm font-medium hover:bg-canvas-warm pointer-events-auto"
            >
              查看全部成就
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Confetti for rare achievements */}
      {isRare && <Confetti />}
    </motion.div>
  );
}

function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full pointer-events-none"
          style={{
            backgroundColor: ["#3390ec", "#f59e0b", "#8b5cf6", "#3b82f6", "#e11d48"][i % 5],
            left: `${10 + Math.random() * 80}%`,
            top: -10,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: ["0vh", "100vh"],
            opacity: [1, 0.6, 0],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
          }}
          transition={{
            duration: 1.5 + Math.random() * 1.5,
            delay: Math.random() * 0.5,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
