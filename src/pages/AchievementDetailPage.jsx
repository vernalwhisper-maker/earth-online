import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import achievementsData, { getRarityLevel, getIconFilename } from "../data/achievements";
import useAchievementStore from "../store/achievementStore";

export default function AchievementDetailPage({ achievementId, onBack }) {
  const achievement = achievementsData.find((a) => a.id === achievementId);
  const state = useAchievementStore((s) =>
    s.achievements.find((a) => a.id === achievementId)
  );

  if (!achievement) {
    return (
      <div className="p-4">
        <button onClick={onBack} className="flex items-center gap-2 text-warm-steel">
          <ArrowLeft size={20} />
          <span>返回</span>
        </button>
        <p className="text-center text-warm-steel mt-12">成就未找到</p>
      </div>
    );
  }

  const rarity = getRarityLevel(achievement.rarity);
  const iconFile = getIconFilename(achievement.id);
  const unlocked = state?.unlocked || false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-[100dvh]"
    >
      <div className="sticky top-0 bg-canvas-warm/90 backdrop-blur-sm z-10 px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-warm-steel hover:text-deep-ink transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">全部成就</span>
        </button>
      </div>

      <div className="px-4 pb-8 max-w-md mx-auto">
        {/* Hero */}
        <div className="flex flex-col items-center mb-8">
          <div
            className={`w-20 h-20 rounded-[1.25rem] overflow-hidden border-2 flex items-center justify-center mb-4 ${
              unlocked
                ? "border-emerald shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                : "border-scribe opacity-30"
            }`}
          >
            <img
              src={`/icons/${iconFile}`}
              alt={achievement.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <h1
            className={`text-[1.5rem] font-extrabold text-center leading-tight ${
              unlocked ? "text-deep-ink" : "text-faded-slate"
            }`}
          >
            {unlocked ? achievement.name : "???"}
          </h1>
          <span
            className={`mt-3 inline-block px-3 py-1 rounded-full text-[0.75rem] font-mono uppercase ${rarity.color}`}
          >
            {rarity.label} · {achievement.rarity}%
          </span>
        </div>

        {unlocked && (
          <div className="border-t border-scribe/30 pt-6">
            <p className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-2 text-center">
              描述
            </p>
            <p className="text-base text-warm-steel text-center leading-relaxed">
              {achievement.description}
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          {unlocked ? (
            <p className="text-sm font-mono text-emerald">
              达成于{" "}
              {state?.unlocked_at
                ? new Date(state.unlocked_at).toLocaleDateString("zh-CN")
                : "今日"}
            </p>
          ) : (
            <p className="text-sm italic text-faded-slate">尚未达成</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
