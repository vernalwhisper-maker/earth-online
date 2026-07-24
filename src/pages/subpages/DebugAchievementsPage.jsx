import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Unlock, Search, Bug } from "lucide-react";
import useAchievementStore from "../../store/achievementStore";
import { getRarityLevel, getIconFilename } from "../../data/achievements";

export default function DebugAchievementsPage({ onBack }) {
  const achievements = useAchievementStore((s) => s.achievements);
  const unlockedMap = useAchievementStore((s) => s.unlockedMap);
  const batchUnlock = useAchievementStore((s) => s.batchUnlock);
  const loadState = useAchievementStore((s) => s.loadState);
  const [searchQuery, setSearchQuery] = useState("");
  const [testText, setTestText] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery) return achievements;
    const q = searchQuery.toLowerCase();
    return achievements.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        String(a.id).includes(q)
    );
  }, [achievements, searchQuery]);

  const handleToggle = (id) => {
    if (unlockedMap[id]) {
      // 锁定：从 localStorage 移除
      const newMap = { ...unlockedMap };
      delete newMap[id];
      localStorage.setItem("earth-online-achievements", JSON.stringify(newMap));
      loadState();
    } else {
      batchUnlock([id], "debug");
    }
  };

  const handleUnlockAll = () => {
    const allIds = achievements.map((a) => a.id);
    batchUnlock(allIds, "debug-all");
  };

  const handleResetAll = () => {
    if (!window.confirm("确定重置所有成就？此操作不可撤销！")) return;
    localStorage.setItem("earth-online-achievements", JSON.stringify({}));
    loadState();
  };

  const handleTestMatch = () => {
    if (!testText.trim()) return;
    // 简单关键词模拟测试
    const matched = achievements.filter((a) => {
      const keywords = a.description.toLowerCase().split(/[\s,，、]+/);
      return keywords.some((k) => k.length > 1 && testText.toLowerCase().includes(k));
    });
    if (matched.length > 0) {
      const msg = "关键词匹配到 " + matched.length + " 个成就:\n" + matched.map((a) => `  #${a.id} ${a.name}`).join("\n");
      alert(msg);
    } else {
      alert("未匹配到任何成就（关键词模拟）");
    }
  };

  const unlockedCount = Object.keys(unlockedMap).length;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="px-4 pt-4 pb-6 max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-warm-steel mb-4 hover:text-deep-ink transition-colors">
        <ArrowLeft size={16} />返回调试
      </button>
      <h1 className="flex items-center gap-2 text-[1.25rem] font-bold text-deep-ink mb-4">
        <Bug size={18} className="text-emerald" />成就调试
      </h1>

      {/* Stats */}
      <div className="bg-surface rounded-card border border-scribe p-3 mb-4 flex items-center justify-between">
        <span className="text-sm text-deep-ink">成就状态</span>
        <span className="text-xs font-mono text-faded-slate">{unlockedCount} / {achievements.length} 已解锁</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <button onClick={handleUnlockAll}
          className="flex-1 py-2 text-xs font-medium bg-emerald text-white rounded-btn hover:bg-emerald-dark">
          解锁全部
        </button>
        <button onClick={handleResetAll}
          className="flex-1 py-2 text-xs font-medium bg-rose text-white rounded-btn hover:bg-red-600">
          重置全部
        </button>
      </div>

      {/* Test text matching */}
      <div className="bg-surface rounded-card border border-scribe p-3 mb-4">
        <p className="text-xs font-mono text-faded-slate mb-2">成就匹配测试（关键词模拟）</p>
        <div className="flex gap-2">
          <input type="text" value={testText} onChange={(e) => setTestText(e.target.value)}
            placeholder="输入笔记内容测试..." 
            className="flex-1 px-2.5 py-1.5 border border-scribe rounded-input bg-surface text-sm text-deep-ink focus:outline-none focus:ring-2 focus:ring-emerald" />
          <button onClick={handleTestMatch}
            className="px-3 py-1.5 bg-emerald/10 text-emerald rounded-btn text-xs font-medium hover:bg-emerald/20">测试</button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faded-slate" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索成就..."
          className="w-full pl-8 pr-3 py-2 bg-surface border border-scribe rounded-btn text-sm text-deep-ink placeholder-faded-slate outline-none focus:ring-2 focus:ring-emerald" />
      </div>

      {/* Achievement list */}
      <div className="space-y-1.5">
        {filtered.map((a) => {
          const isUnlocked = !!unlockedMap[a.id];
          const rarity = getRarityLevel(a.rarity);
          const iconFile = getIconFilename(a.id);
          return (
            <button key={a.id} onClick={() => handleToggle(a.id)}
              className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-btn transition-colors text-left " +
                (isUnlocked ? "bg-emerald/5 hover:bg-emerald/10" : "hover:bg-canvas-warm")}>
              <div className={"w-8 h-8 rounded-[0.5rem] overflow-hidden border " + (isUnlocked ? "border-emerald" : "border-scribe opacity-40")}>
                <img src={`/icons/${iconFile}`} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={"text-sm font-medium " + (isUnlocked ? "text-deep-ink" : "text-faded-slate")}>
                    #{a.id} {a.name}
                  </span>
                  <span className={"text-[0.5rem] font-mono px-1 py-0.5 rounded-full " + rarity.color}>
                    {rarity.label}
                  </span>
                </div>
                <p className="text-[11px] text-warm-steel truncate">{a.description}</p>
              </div>
              {isUnlocked ? (
                <Unlock size={14} className="text-emerald shrink-0" />
              ) : (
                <Lock size={14} className="text-faded-slate shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
