import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { getRarityLevel, getIconFilename } from "../../data/achievements";

const overlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const sheet = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0, opacity: 1,
    transition: { type: "spring", stiffness: 200, damping: 22, mass: 0.8 },
  },
  exit: {
    y: "100%", opacity: 0,
    transition: { type: "spring", stiffness: 300, damping: 25, mass: 0.8 },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export default function AchievementBatchModal({ achievements, onDismiss, onViewAll }) {
  if (!achievements || achievements.length === 0) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      variants={overlay}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-deep-ink/60"
        onClick={onDismiss}
      />

      {/* Sheet */}
      <motion.div
        className="relative bg-surface rounded-[1.5rem] w-full max-w-[420px] mx-4 p-6 shadow-soft flex flex-col items-center gap-4 sm:mb-0 max-h-[80vh]"
        variants={sheet}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Close button */}
        <motion.button
          onClick={onDismiss}
          whileTap={{ scale: 0.85 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas-warm"
        >
          <X size={18} className="text-warm-steel" />
        </motion.button>

        {/* Header */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col items-center gap-2 mt-2">
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
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="w-full flex-1 overflow-y-auto grid grid-cols-3 gap-3 py-2 px-1 scrollbar-none"
        >
          {achievements.map((a) => {
            const rarity = getRarityLevel(a.rarity);
            const iconFile = getIconFilename(a.id);
            const isRare = a.rarity < 10;
            return (
              <motion.div
                key={a.id}
                variants={fadeUp}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-canvas-warm transition-colors"
              >
                <div
                  className={`w-[52px] h-[52px] rounded-[1rem] overflow-hidden border-2 border-emerald/60 ${
                    isRare ? "shadow-[0_0_16px_rgba(16,185,129,0.25)]" : ""
                  }`}
                >
                  <img
                    src={`/icons/${iconFile}`}
                    alt={a.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[0.625rem] text-deep-ink text-center leading-tight line-clamp-2">
                  {a.name}
                </span>
                <span className={`text-[0.5rem] font-mono px-1.5 py-0.5 rounded-full ${rarity.color} opacity-80`}>
                  {rarity.label}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-2 pt-1">
          <motion.button
            onClick={onDismiss}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="w-full py-2.5 bg-emerald text-white rounded-btn text-sm font-medium hover:bg-emerald-dark"
          >
            继续记录
          </motion.button>
          <motion.button
            onClick={onViewAll}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="w-full py-2.5 border border-scribe text-warm-steel rounded-btn text-sm font-medium hover:bg-canvas-warm"
          >
            查看全部成就
          </motion.button>
        </div>
      </motion.div>

      {/* Confetti */}
      <Confetti />
    </motion.div>
  );
}

function Confetti() {
  const colors = ["#10b981", "#f59e0b", "#8b5cf6", "#3b82f6", "#e11d48", "#ec4899", "#14b8a6"];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
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
