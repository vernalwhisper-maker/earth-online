import { motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { getRarityLevel, getProbabilityText } from "../../data/achievements";
import useAchievementStore from "../../store/achievementStore";
import AchievementIcon from "./AchievementIcon";

/**
 * 成就解锁弹窗。
 * - 根元素透传 motion props（由外层 motion.create(UnlockModal) + AnimatePresence 控制
 *   整体淡入淡出与退出卸载，退出完成即卸载，不会残留全屏遮罩拦截点击）
 * - 内部所有动画均使用显式 initial/animate（不依赖 variants 传播），
 *   保证按钮始终可见可点，同时保留卡片滑入 / 内容交错 / 按压反馈全部效果
 */
export default function UnlockModal({ achievement, onDismiss, onViewAll, ...motionProps }) {
  if (!achievement) return null;

  const achievements = useAchievementStore((s) => s.achievements);

  const rarity = getRarityLevel(achievement.rarity);
  const probText = getProbabilityText(achievement.rarity);
  const isRare = typeof achievement.rarity === "number" ? achievement.rarity < 10 : parseFloat(achievement.rarity) < 10;
  const isHidden = !!achievement.hidden;

  // 系列进度：破损系列 1/3（已解锁成员数 / 系列总数）
  const seriesInfo = (() => {
    if (!achievement.series) return null;
    const members = achievements.filter((a) => a.series === achievement.series);
    if (members.length === 0) return null;
    const unlockedCount = members.filter((a) => a.unlocked).length;
    return { name: achievement.series, unlocked: unlockedCount, total: members.length };
  })();

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

      {/* 隐藏成就：卡片下方的暗红光晕（触发动画氛围） */}
      {isHidden && <HiddenGlow />}

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
            <AchievementIcon achievement={achievement} />
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

          {/* 隐藏成就提醒徽章 */}
          {isHidden && (
            <motion.span
              initial={{ opacity: 0, scale: 0.7, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.32 }}
              className="px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/50 text-[0.6875rem] font-bold tracking-wider text-amber-300 flex items-center gap-1.5"
            >
              <motion.span
                animate={{ opacity: [1, 0.35, 1], scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block"
              >
                ✦
              </motion.span>
              隐藏成就
            </motion.span>
          )}

          {/* Series badge — 破损系列 1/3 */}
          {seriesInfo && (
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.33 }}
              className="px-3 py-1 rounded-full bg-scribe/40 border border-scribe text-[0.6875rem] font-medium text-warm-steel"
            >
              {seriesInfo.name}系列 {seriesInfo.unlocked}/{seriesInfo.total}
            </motion.span>
          )}

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
            {rarity.label} · 仅 {probText} 的玩家拥有
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

      {/* 隐藏成就：触发动画（灰烬粒子 + 扫描线）；普通稀有成就保留彩带 */}
      {isHidden ? <HiddenFX /> : isRare && <Confetti />}
    </motion.div>
  );
}

/** 隐藏成就触发动画：卡片下方的暗红光晕脉冲 */
function HiddenGlow() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
      <motion.div
        className="w-[340px] h-[340px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(180,60,40,0.4) 0%, rgba(180,60,40,0) 70%)", filter: "blur(24px)" }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.9, 0.35], scale: [0.4, 1.5, 1.9] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/** 隐藏成就触发动画：灰烬粒子上升 + 金色扫描线（全屏范围） */
function HiddenFX() {
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {/* 金色扫描线（自上而下，带淡入淡出） */}
      <motion.div
        className="absolute left-0 right-0 h-[2px]"
        style={{ background: "linear-gradient(90deg, transparent, rgba(245,190,90,0.55), transparent)", filter: "blur(0.5px)" }}
        initial={{ top: "-5%", opacity: 0 }}
        animate={{ top: ["-5%", "105%"], opacity: [0, 0.9, 0.9, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", times: [0, 0.15, 0.85, 1] }}
      />
      {/* 黑色灰烬粒子：从底部升至屏幕顶部（全屏范围，不再只停留在底部区域） */}
      {Array.from({ length: 22 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-black"
          style={{ left: `${4 + Math.random() * 92}%`, bottom: -12 }}
          initial={{ y: 0, opacity: 0.85 }}
          animate={{ y: -vh - 20, opacity: [0.85, 0.5, 0] }}
          transition={{
            duration: 3.5 + Math.random() * 3,
            delay: Math.random() * 2.5,
            ease: "easeOut",
            repeat: Infinity,
          }}
        />
      ))}
    </div>
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
