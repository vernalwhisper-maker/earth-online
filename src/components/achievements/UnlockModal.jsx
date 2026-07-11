import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { getRarityLevel, getIconFilename } from "../../data/achievements";

const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

const slideUp = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 18 },
  },
  exit: { y: "100%", transition: { duration: 0.2 } },
};

const scaleIn = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 150, damping: 12 },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export default function UnlockModal({ achievement, onDismiss, onViewAll }) {
  if (!achievement) return null;

  const rarity = getRarityLevel(achievement.rarity);
  const iconFile = getIconFilename(achievement.id);
  const isRare = achievement.rarity < 10;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      variants={fade}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-deep-ink/60"
        onClick={onDismiss}
      />

      {/* Card */}
      <motion.div
        className="relative bg-surface rounded-[1.5rem] w-full max-w-[420px] mx-4 p-8 shadow-soft flex flex-col items-center gap-5 sm:mb-0"
        variants={slideUp}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Close */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas-warm transition-colors"
        >
          <X size={18} className="text-warm-steel" />
        </button>

        <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col items-center gap-5 w-full">
          {/* Sparkle icon */}
          <motion.div variants={scaleIn}>
            <Sparkles size={24} className="text-emerald" />
          </motion.div>

          {/* Achievement icon */}
          <motion.div
            variants={scaleIn}
            className={`w-[72px] h-[72px] rounded-[1.25rem] overflow-hidden border-2 border-emerald ${
              isRare ? "shadow-[0_0_24px_rgba(16,185,129,0.3)]" : ""
            }`}
          >
            <img
              src={`/icons/${iconFile}`}
              alt={achievement.name}
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Label */}
          <motion.span variants={fadeUp} className="text-[0.75rem] font-bold uppercase tracking-[0.08em] text-emerald">
            成就解锁!
          </motion.span>

          {/* Name */}
          <motion.h2
            variants={fadeUp}
            className="text-[1.75rem] sm:text-[2rem] font-extrabold text-deep-ink text-center leading-tight"
          >
            {achievement.name}
          </motion.h2>

          {/* Description */}
          <motion.p variants={fadeUp} className="text-[0.9375rem] text-warm-steel text-center leading-relaxed">
            {achievement.description}
          </motion.p>

          {/* Rarity badge */}
          <motion.span
            variants={fadeUp}
            className={`inline-block px-3 py-1 rounded-full text-[0.75rem] font-mono uppercase ${rarity.color}`}
          >
            {rarity.label} · 仅 {achievement.rarity}% 的玩家拥有
          </motion.span>

          {/* Buttons */}
          <motion.div variants={fadeUp} className="w-full flex flex-col gap-2 mt-2">
            <button
              onClick={onDismiss}
              className="w-full py-2.5 bg-emerald text-white rounded-btn text-sm font-medium hover:bg-emerald-dark transition-colors active:scale-[0.97]"
            >
              继续记录
            </button>
            <button
              onClick={onViewAll}
              className="w-full py-2.5 border border-scribe text-warm-steel rounded-btn text-sm font-medium hover:bg-canvas-warm transition-colors"
            >
              查看全部成就
            </button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Confetti for rare achievements */}
      {isRare && <Confetti />}
    </motion.div>
  );
}

function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: ["#10b981", "#f59e0b", "#8b5cf6", "#3b82f6", "#e11d48"][i % 5],
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
