import { motion } from "framer-motion";
import { FileText, Trophy, Settings } from "lucide-react";
import useAchievementStore from "../../store/achievementStore";
import useTodoStore from "../../store/todoStore";
import useSettingsStore from "../../store/settingsStore";

const tabs = [
  { key: "home", label: "笔记", icon: FileText },
  { key: "gallery", label: "成就", icon: Trophy },
  { key: "settings", label: "设置", icon: Settings },
];

// iOS 26 Liquid Glass 弹簧物理参数
// stiffness ↑ = 更硬, damping ↑ = 更不弹, mass ↑ = 更重
const springPill = { type: "spring", stiffness: 520, damping: 34, mass: 0.65 };
const springTap = { type: "spring", stiffness: 500, damping: 11, mass: 0.55 };
const springIcon = { type: "spring", stiffness: 360, damping: 15, mass: 0.7 };
const springBadge = { type: "spring", stiffness: 400, damping: 11 };

export default function TabBar({ currentPage, onNavigate }) {
  const unlockedCount = useAchievementStore((s) => s.getUnlockedCount());
  const activeTodoCount = useTodoStore((s) => s.activeCount);
  const tabBarOpacity = useSettingsStore((s) => s.tabBarOpacity);
  const isDark = useSettingsStore((s) => s.darkMode);

  // 内容感知亮度 — 暗黑模式下玻璃变深，高光更冷
  const glassBase = isDark
    ? `linear-gradient(135deg, 
      rgba(30,30,30,${tabBarOpacity / 90}) 0%, 
      rgba(16,185,129,${tabBarOpacity / 500}) 40%, 
      rgba(30,30,30,${tabBarOpacity / 80}) 100%)`
    : `linear-gradient(135deg, 
      rgba(255,255,255,${tabBarOpacity / 100}) 0%, 
      rgba(16,185,129,${tabBarOpacity / 600}) 40%, 
      rgba(255,255,255,${tabBarOpacity / 150}) 100%)`;

  const specularTop = isDark
    ? "linear-gradient(to right, transparent, rgba(255,255,255,0.15) 15%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.15) 85%, transparent)"
    : "linear-gradient(to right, transparent, rgba(255,255,255,0.95) 15%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.95) 85%, transparent)";

  return (
    <nav className="safe-area-bottom fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2.5rem)] max-w-sm">
      <div className="relative rounded-[2rem] px-2 py-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.15)] overflow-hidden"
        style={{ willChange: 'transform' }}>
        
        {/* ============================================ */}
        {/* Layer 1: 主玻璃基底 — emerald 色调 + 高斯模糊 */}
        {/* ============================================ */}
        <div className="absolute inset-0"
          style={{
            background: glassBase,
            backdropFilter: "blur(35px) saturate(200%)",
            WebkitBackdropFilter: "blur(35px) saturate(200%)",
          }} />

        {/* ============================================ */}
        {/* Layer 2: Specular Top Edge — 顶部边缘高光   */}
        {/* iOS 26 玻璃的标志性：光源在顶部形成亮边      */}
        {/* ============================================ */}
        <div className="absolute top-0 left-4 right-4 h-[1.5px]"
          style={{ background: specularTop }} />

        {/* ============================================ */}
        {/* Layer 3: Bottom Glow — 底部 emerald 反光     */}
        {/* 玻璃底部的环境光反射，增加材质厚度感          */}
        {/* ============================================ */}
        <div className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full"
          style={{
            background: `linear-gradient(to right, transparent, rgba(16,185,129,${isDark ? 0.25 : 0.15}) 30%, rgba(16,185,129,${isDark ? 0.12 : 0.08}) 50%, rgba(16,185,129,${isDark ? 0.25 : 0.15}) 70%, transparent)`,
          }} />

        {/* ============================================ */}
        {/* Layer 4: 棱镜侧光效 — 左右边缘的垂直高光     */}
        {/* 模拟玻璃切割面的 prismatic 折射                */}
        {/* ============================================ */}
        <div className="absolute top-3 bottom-3 left-0 w-[1px] rounded-full"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.3) 30%, rgba(255,255,255,0.1) 70%, transparent)",
          }} />
        <div className="absolute top-3 bottom-3 right-0 w-[1px] rounded-full"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.3) 30%, rgba(255,255,255,0.1) 70%, transparent)",
          }} />

        {/* ============================================ */}
        {/* Layer 5: 边框层 — 双层边框增加精致感          */}
        {/* ============================================ */}
        <div className="absolute inset-0 rounded-[2rem] border border-white/25" />
        <div className="absolute inset-[1px] rounded-[2rem] border border-white/70" />

        {/* ============================================ */}
        {/* Layer 6: 底部内阴影 — 玻璃厚度感              */}
        {/* ============================================ */}
        <div className="absolute inset-x-4 bottom-0 h-4 rounded-full"
          style={{
            background: `linear-gradient(to top, rgba(0,0,0,${isDark ? 0.12 : 0.05}), transparent)`,
          }} />

        {/* ============================================ */}
        {/* Tab 按钮区域                                    */}
        {/* ============================================ */}
        <div className="relative z-10 flex items-center justify-around w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentPage === tab.key;
            const showTodoBadge = tab.key === "home" && activeTodoCount > 0;

            return (
              <motion.button
                key={tab.key}
                onClick={() => onNavigate(tab.key)}
                whileTap={{ scale: 0.92 }}
                transition={springTap}
                className="relative flex items-center justify-center py-2 flex-1 min-h-[46px]"
              >
                {/* ============================================ */}
                {/* 活跃 tab 液态 Pill — 核心视觉                */}
                {/* 使用 layoutId 实现平滑弹簧过渡                */}
                {/* pill 本身带有玻璃效果（blur + 内高光）        */}
                {/* ============================================ */}
                {isActive && (
                  <motion.div
                    layoutId="liquid-pill"
                    className="absolute inset-1 rounded-full"
                    style={{
                      background: isDark
                        ? "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))"
                        : "linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.15))",
                      boxShadow: isDark
                        ? "inset 0 1px 2px rgba(255,255,255,0.15), 0 2px 12px rgba(16,185,129,0.2)"
                        : "inset 0 1px 2px rgba(255,255,255,0.7), 0 2px 12px rgba(16,185,129,0.15)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                    initial={false}
                    transition={springPill}
                  />
                )}

                <div className="relative flex flex-col items-center gap-0.5 z-10">
                  {/* 图标容器 */}
                  <motion.div
                    animate={isActive
                      ? { scale: 1.12, y: -1 }
                      : { scale: 1, y: 0 }}
                    transition={springIcon}
                    className="relative"
                  >
                    <Icon
                      size={20}
                      className={
                        isActive
                          ? "text-emerald drop-shadow-[0_1px_3px_rgba(16,185,129,0.3)]"
                          : "text-warm-steel/70"
                      }
                    />

                    {/* 待办 Badge — 蓝色液态滴 */}
                    {showTodoBadge && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={springBadge}
                        className="absolute -top-2 -right-2.5 bg-blue-500 text-white text-[9px] font-mono font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5"
                        style={{ boxShadow: "0 1px 4px rgba(59,130,246,0.4)" }}
                      >
                        {activeTodoCount}
                      </motion.span>
                    )}

                    {/* 成就 Badge — emerald 液态滴 */}
                    {tab.key === "gallery" && unlockedCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={springBadge}
                        className="absolute -top-2 -right-2.5 bg-emerald text-white text-[9px] font-mono font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5"
                        style={{ boxShadow: "0 1px 4px rgba(16,185,129,0.4)" }}
                      >
                        {unlockedCount}
                      </motion.span>
                    )}
                  </motion.div>

                  {/* 标签文字 */}
                  <motion.span
                    animate={isActive
                      ? { scale: 1.05, y: 0 }
                      : { scale: 1, y: 0 }}
                    transition={springIcon}
                    className="text-[10px] font-semibold tracking-wide"
                    style={{
                      color: isActive
                        ? (isDark ? "#34d399" : "#059669")
                        : (isDark ? "rgba(163,162,158,0.8)" : "rgba(107,106,103,0.7)"),
                    }}
                  >
                    {tab.label}
                  </motion.span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
