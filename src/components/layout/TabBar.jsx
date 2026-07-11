import { motion } from "framer-motion";
import { FileText, Trophy, Settings } from "lucide-react";
import useAchievementStore from "../../store/achievementStore";
import useSettingsStore from "../../store/settingsStore";

const tabs = [
  { key: "home", label: "笔记", icon: FileText },
  { key: "gallery", label: "成就", icon: Trophy },
  { key: "settings", label: "设置", icon: Settings },
];

export default function TabBar({ currentPage, onNavigate }) {
  const unlockedCount = useAchievementStore((s) => s.getUnlockedCount());
  const tabBarOpacity = useSettingsStore((s) => s.tabBarOpacity);

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
      <div className="relative flex items-center justify-around rounded-[1.5rem] px-4 py-1 shadow-[0_8px_32px_rgba(0,0,0,0.12)] safe-area-bottom overflow-hidden">
        {/* 液态玻璃背景层 */}
                <div
          className="absolute inset-0 backdrop-blur-xl"
          style={{
            background: `linear-gradient(to bottom, rgba(255,255,255,${tabBarOpacity / 100}), rgba(255,255,255,${tabBarOpacity / 200}))`,
          }}
        />
        <div className="absolute inset-0 rounded-[1.5rem] border border-white/20" />
        <div className="absolute inset-[1px] rounded-[1.5rem] border border-white/60" />

        {/* 内容 */}
        <div className="relative z-10 flex items-center justify-around w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentPage === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onNavigate(tab.key)}
                className="relative flex flex-col items-center gap-0.5 py-2 min-w-[64px] min-h-[44px]"
              >
                <div className="relative">
                  <Icon
                    size={20}
                    className={
                      isActive ? "text-emerald" : "text-warm-steel/70"
                    }
                  />
                  {tab.key === "gallery" && unlockedCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-emerald text-white text-[10px] font-mono font-semibold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                      {unlockedCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    isActive ? "text-emerald" : "text-warm-steel/70"
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute top-0 w-8 h-0.5 bg-emerald rounded-full"
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}