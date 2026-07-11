import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import useAchievementStore from "../store/achievementStore";
import { getRarityLevel, getIconFilename } from "../data/achievements";
import ProgressRing from "../components/ui/ProgressRing";
import { Check } from "lucide-react";

const filters = ["全部", "已解锁", "未解锁"];

export default function AchievementGalleryPage({ onViewAchievement }) {
  const [filter, setFilter] = useState("全部");
  const [sortBy, setSortBy] = useState("default");
  const achievements = useAchievementStore((s) => s.achievements);
  const getSorted = useAchievementStore((s) => s.getSortedAchievements);

  const sorted = useMemo(() => getSorted(filter, sortBy), [filter, sortBy, achievements]);
  const unlockedCount = useMemo(() => achievements.filter((a) => a.unlocked).length, [achievements]);
  const totalCount = achievements.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 pt-4 pb-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[1.5rem] font-bold text-deep-ink">成就</h1>
        <ProgressRing progress={unlockedCount / totalCount} size={36} strokeWidth={3}>
          <span className="text-[10px] font-mono font-semibold text-deep-ink">
            {unlockedCount}
          </span>
        </ProgressRing>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-none">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`relative px-4 py-1.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
              filter === f
                ? "text-emerald"
                : "text-warm-steel hover:text-deep-ink"
            }`}
          >
            {filter === f && (
              <motion.div
                layoutId="filter-pill"
                className="absolute inset-0 bg-emerald/10 rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">{f}</span>
          </button>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={() =>
            setSortBy(sortBy === "rarity" ? "default" : "rarity")
          }
          className="text-xs font-mono text-faded-slate hover:text-warm-steel transition-colors"
        >
          {sortBy === "rarity" ? "按默认排序" : "按稀有度排序"}
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-scribe/30 flex items-center justify-center">
            <span className="text-2xl text-faded-slate">?</span>
          </div>
          <p className="text-sm text-warm-steel">
            {filter === "已解锁"
              ? "还没有解锁任何成就"
              : "开始记笔记来解锁你的人生成就吧"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sorted.map((a, i) => {
            const rarity = getRarityLevel(a.rarity);
            const iconFile = getIconFilename(a.id);
            return (
              <motion.button
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onViewAchievement(a.id)}
                className={`relative bg-surface rounded-card border text-left p-3 transition-all ${
                  a.unlocked
                    ? "border-emerald/40 hover:border-emerald"
                    : "border-scribe hover:border-warm-steel/30"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-icon overflow-hidden mb-2 ${
                    a.unlocked ? "" : "opacity-30"
                  }`}
                >
                  {a.unlocked ? (
                    <img
                      src={`/icons/${iconFile}`}
                      alt={a.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-full h-full bg-scribe/30 rounded-icon flex items-center justify-center"
                    >
                      <span className="text-lg text-faded-slate">?</span>
                    </div>
                  )}
                </div>
                <p
                  className={`text-sm font-semibold leading-snug line-clamp-2 ${
                    a.unlocked ? "text-deep-ink" : "text-faded-slate"
                  }`}
                >
                  {a.unlocked ? a.name : "???"}
                </p>
                <span
                  className={`mt-1.5 inline-block px-1.5 py-0.5 rounded text-[0.6875rem] font-mono uppercase ${rarity.color}`}
                >
                  {rarity.label}
                </span>
                {a.unlocked && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-emerald rounded-full flex items-center justify-center">
                    <Check size={10} strokeWidth={3} className="text-white" />
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3 justify-center text-xs font-mono text-faded-slate">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-amber-500" /> 传说 (&lt;5%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-violet-500" /> 史诗 (&lt;10%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-blue-500" /> 稀有 (&lt;30%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-gray-400" /> 普通 (&ge;30%)
        </span>
      </div>
    </motion.div>
  );
}
