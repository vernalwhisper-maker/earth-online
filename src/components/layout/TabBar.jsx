import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Trophy, Settings, Pin, Save, Sparkles, Trash2, Palette, Folder, X, Check, Hash, Plus } from "lucide-react";
import useAchievementStore from "../../store/achievementStore";
import useTodoStore from "../../store/todoStore";
import useSettingsStore from "../../store/settingsStore";
import useEditorActionsStore from "../../store/editorActionsStore";
import { BG_COLORS, DEFAULT_FOLDERS } from "../../data/noteTypes";

const tabs = [
  { key: "home", label: "笔记", icon: FileText },
  { key: "gallery", label: "成就", icon: Trophy },
  { key: "settings", label: "设置", icon: Settings },
];

// 编辑器操作按钮
const editorActions = [
  { key: "pin", icon: Pin, getLabel: (pinned) => pinned ? "已置顶" : "置顶", getIconClass: (pinned) => pinned ? "text-emerald" : "text-warm-steel/70", action: "onPinToggle" },
  { key: "save", icon: Save, label: "保存", iconClass: "text-warm-steel/70", action: "onSave" },
  { key: "ai", icon: Sparkles, getLabel: (_, analyzing) => analyzing ? "分析中" : "匹配成就", iconClass: "text-emerald", action: "onSaveWithAI", disabled: "isAIAnalyzing" },
  { key: "more", icon: Palette, label: "更多", iconClass: "text-warm-steel/70" },
  { key: "tags", icon: Hash, label: "标签", iconClass: "text-warm-steel/70" },
];

// 选择模式操作按钮
const selectActions = [
  { key: "delete", icon: Trash2, label: "删除", iconClass: "text-rose", action: "onBatchDelete", needsConfirm: true },
  { key: "move", icon: Folder, label: "移动", iconClass: "text-warm-steel/70", action: "onBatchMove" },
  { key: "pin", icon: Pin, iconClass: "text-warm-steel/70", action: "onBatchTogglePin", getLabel: (pinState) => pinState === "all_pinned" ? "取消置顶" : "置顶" },
  { key: "tags", icon: Hash, label: "删标签", iconClass: "text-warm-steel/70" },
  { key: "ai", icon: Sparkles, label: "量建标签", iconClass: "text-violet-500", action: "onAutoTag", conditional: "hasApiKey" },
];

// iOS 26 Liquid Glass 弹簧物理参数
const springPill = { type: "spring", stiffness: 520, damping: 34, mass: 0.65 };
const springTap = { type: "spring", stiffness: 500, damping: 11, mass: 0.55 };
const springIcon = { type: "spring", stiffness: 360, damping: 15, mass: 0.7 };
const springBadge = { type: "spring", stiffness: 400, damping: 11 };

export default function TabBar({ currentPage, onNavigate }) {
  const unlockedCount = useAchievementStore((s) => s.getUnlockedCount());
  const activeTodoCount = useTodoStore((s) => s.activeCount);
  const tabBarOpacity = useSettingsStore((s) => s.tabBarOpacity);
  const isDark = useSettingsStore((s) => s.darkMode);
  const editor = useEditorActionsStore();

  const isSelectMode = currentPage === "home" && editor.selectCount > 0;

  // 删除确认弹窗状态
  const [confirmTarget, setConfirmTarget] = useState(null);
  const deleteBtnRef = useRef(null);

  // 标签弹窗状态
  const [showTagPopup, setShowTagPopup] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const tagInputRef = useRef(null);

  // 更多弹窗状态
  const [showMorePopup, setShowMorePopup] = useState(false);

  // 批量删标签弹窗
  const [showBatchTagPopup, setShowBatchTagPopup] = useState(false);

  const glassBase = isDark
    ? `linear-gradient(135deg, rgba(30,30,30,${tabBarOpacity / 90}) 0%, rgba(16,185,129,${tabBarOpacity / 500}) 40%, rgba(30,30,30,${tabBarOpacity / 80}) 100%)`
    : `linear-gradient(135deg, rgba(255,255,255,${tabBarOpacity / 100}) 0%, rgba(16,185,129,${tabBarOpacity / 600}) 40%, rgba(255,255,255,${tabBarOpacity / 150}) 100%)`;

  const glassConfirm = isDark
    ? "linear-gradient(135deg, rgba(40,20,20,0.95), rgba(30,10,10,0.92))"
    : "linear-gradient(135deg, rgba(255,240,240,0.98), rgba(255,225,225,0.95))";

  const specularTop = isDark
    ? "linear-gradient(to right, transparent, rgba(255,255,255,0.15) 15%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.15) 85%, transparent)"
    : "linear-gradient(to right, transparent, rgba(255,255,255,0.95) 15%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.95) 85%, transparent)";

  const handleActionClick = (act) => {
    if (act.key === "tags") {
      if (currentPage === "home" && editor.selectCount > 0) {
        setShowBatchTagPopup(true);
      } else {
        setShowTagPopup(true);
      }
    } else if (act.key === "more") {
      setShowMorePopup(true);
    } else if (act.needsConfirm) {
      setConfirmTarget({
        action: () => editor[act.action]?.(),
        label: act.key === "delete" ? "确认删除？" : "确认操作？",
        key: act.key,
      });
    } else {
      editor[act.action]?.();
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleAddTag(); }
  };

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t) { editor.onAddTag?.(t); setTagInput(""); }
  };

  return (
    <>
      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {confirmTarget && (
          <>
            {/* 半透明遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setConfirmTarget(null)}
            />
            {/* 磨砂玻璃确认卡片 — 从底部弹出的液态玻璃 */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 400, damping: 28, mass: 0.8 }}
              className="fixed left-1/2 -translate-x-1/2 z-40 w-[200px] rounded-[1.5rem] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.2)]"
              style={{ bottom: "calc(100px)" }}
            >
              {/* 玻璃背景 */}
              <div className="absolute inset-0"
                style={{
                  background: glassConfirm,
                  backdropFilter: "blur(35px) saturate(200%)",
                  WebkitBackdropFilter: "blur(35px) saturate(200%)",
                }} />
              {/* 高光 */}
              <div className="absolute top-0 left-4 right-4 h-[1.5px]" style={{ background: specularTop }} />
              <div className="absolute inset-0 rounded-[1.5rem] border border-white/25" />
              <div className="absolute inset-[1px] rounded-[1.5rem] border border-white/70" />

              <div className="relative z-10 px-5 py-4 text-center">
                <p className="text-sm font-semibold mb-3" style={{ color: isDark ? "#fca5a5" : "#dc2626" }}>
                  {confirmTarget.label}
                </p>
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => setConfirmTarget(null)}
                    whileTap={{ scale: 0.92 }}
                    transition={springTap}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium"
                    style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)", color: isDark ? "rgba(163,162,158,0.9)" : "rgba(107,106,103,0.9)" }}
                  >
                    <X size={14} />取消
                  </motion.button>
                  <motion.button
                    onClick={() => { confirmTarget.action(); setConfirmTarget(null); }}
                    whileTap={{ scale: 0.92 }}
                    transition={springTap}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium bg-rose text-white shadow-sm"
                  >
                    <Check size={14} />确认
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 标签管理弹窗 */}
      <AnimatePresence>
        {showTagPopup && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30" onClick={() => setShowTagPopup(false)} />
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 400, damping: 28, mass: 0.8 }}
              className="fixed left-1/2 -translate-x-1/2 z-40 w-[260px] rounded-[1.5rem] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.2)]"
              style={{ bottom: "calc(100px)" }}
            >
              <div className="absolute inset-0"
                style={{
                  background: isDark
                    ? "linear-gradient(135deg, rgba(30,30,30,0.98), rgba(20,20,20,0.95))"
                    : "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,247,244,0.95))",
                  backdropFilter: "blur(35px) saturate(200%)",
                  WebkitBackdropFilter: "blur(35px) saturate(200%)",
                }} />
              <div className="absolute top-0 left-4 right-4 h-[1.5px]" style={{ background: specularTop }} />
              <div className="absolute inset-0 rounded-[1.5rem] border border-white/25" />
              <div className="absolute inset-[1px] rounded-[1.5rem] border border-white/70" />

              <div className="relative z-10 px-4 py-4">
                <p className="text-sm font-semibold text-center mb-3" style={{ color: isDark ? "rgba(255,255,255,0.9)" : "#1c1b1a" }}>
                  管理标签
                </p>
                {/* 标签列表 */}
                {editor.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editor.tags.map((tag) => (
                      <span key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                          color: isDark ? "rgba(163,162,158,0.9)" : "rgba(107,106,103,0.9)",
                        }}>
                        {tag}
                        <button onClick={() => editor.onRemoveTag?.(tag)} className="hover:text-deep-ink transition-colors">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* 添加标签 */}
                <div className="flex gap-2">
                  <input
                    ref={tagInputRef}
                    type="text" value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="输入标签..."
                    className="flex-1 px-3 py-2 text-sm rounded-xl border outline-none"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.02)",
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                      color: isDark ? "rgba(255,255,255,0.8)" : "#1c1b1a",
                    }}
                  />
                  <motion.button
                    onClick={handleAddTag}
                    whileTap={{ scale: 0.88 }}
                    transition={springTap}
                    className="px-3 py-2 rounded-xl text-sm font-medium bg-emerald text-white"
                  >
                    <Plus size={16} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 更多设置弹窗 */}
      <AnimatePresence>
        {showMorePopup && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30" onClick={() => setShowMorePopup(false)} />
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 400, damping: 28, mass: 0.8 }}
              className="fixed left-1/2 -translate-x-1/2 z-40 w-[280px] rounded-[1.5rem] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.2)]"
              style={{ bottom: "calc(100px)" }}
            >
              <div className="absolute inset-0"
                style={{
                  background: isDark
                    ? "linear-gradient(135deg, rgba(30,30,30,0.98), rgba(20,20,20,0.95))"
                    : "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,247,244,0.95))",
                  backdropFilter: "blur(35px) saturate(200%)",
                  WebkitBackdropFilter: "blur(35px) saturate(200%)",
                }} />
              <div className="absolute top-0 left-4 right-4 h-[1.5px]" style={{ background: specularTop }} />
              <div className="absolute inset-0 rounded-[1.5rem] border border-white/25" />
              <div className="absolute inset-[1px] rounded-[1.5rem] border border-white/70" />

              <div className="relative z-10 px-5 py-4 space-y-4">
                <p className="text-sm font-semibold text-center mb-1" style={{ color: isDark ? "rgba(255,255,255,0.9)" : "#1c1b1a" }}>
                  更多设置
                </p>
                <div>
                  <label className="text-xs font-mono mb-1.5 block" style={{ color: isDark ? "rgba(163,162,158,0.8)" : "rgba(107,106,103,0.8)" }}>
                    背景颜色
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {BG_COLORS.map((c) => (
                      <button key={c.id} onClick={() => editor.onChangeBgColor?.(c.id)}
                        className={"w-7 h-7 rounded-full transition-all border-2 " +
                          (editor.bgColorId === c.id ? "border-emerald scale-110 shadow-sm" : "border-transparent") + " " + c.class}
                        title={c.label} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-mono mb-1.5 block flex items-center gap-1"
                    style={{ color: isDark ? "rgba(163,162,158,0.8)" : "rgba(107,106,103,0.8)" }}>
                    <Folder size={10} /> 文件夹
                  </label>
                  <select value={editor.folderId} onChange={(e) => editor.onChangeFolder?.(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-xl border outline-none"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.02)",
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                      color: isDark ? "rgba(255,255,255,0.8)" : "#1c1b1a",
                    }}>
                    {DEFAULT_FOLDERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
                {/* 删除笔记 — 仅在已有笔记时显示 */}
                {editor.isExistingNote && (
                  <>
                    <div className="h-px" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
                    <motion.button
                      onClick={() => {
                        setShowMorePopup(false);
                        setConfirmTarget({
                          action: () => editor.onDelete?.(),
                          label: "确认删除？",
                          key: "delete",
                        });
                      }}
                      whileTap={{ scale: 0.92 }}
                      transition={springTap}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium"
                      style={{ color: isDark ? "#fca5a5" : "#dc2626" }}
                    >
                      <Trash2 size={16} /> 删除笔记
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 批量删标签弹窗 */}
      <AnimatePresence>
        {showBatchTagPopup && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30" onClick={() => setShowBatchTagPopup(false)} />
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 400, damping: 28, mass: 0.8 }}
              className="fixed left-1/2 -translate-x-1/2 z-40 w-[260px] rounded-[1.5rem] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.2)]"
              style={{ bottom: "calc(100px)" }}
            >
              <div className="absolute inset-0"
                style={{
                  background: isDark
                    ? "linear-gradient(135deg, rgba(30,30,30,0.98), rgba(20,20,20,0.95))"
                    : "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,247,244,0.95))",
                  backdropFilter: "blur(35px) saturate(200%)",
                  WebkitBackdropFilter: "blur(35px) saturate(200%)",
                }} />
              <div className="absolute top-0 left-4 right-4 h-[1.5px]" style={{ background: specularTop }} />
              <div className="absolute inset-0 rounded-[1.5rem] border border-white/25" />
              <div className="absolute inset-[1px] rounded-[1.5rem] border border-white/70" />

              <div className="relative z-10 px-4 py-4">
                <p className="text-sm font-semibold text-center mb-3" style={{ color: isDark ? "rgba(255,255,255,0.9)" : "#1c1b1a" }}>
                  选择要移除的标签
                </p>
                {editor.batchTagList.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: isDark ? "rgba(163,162,158,0.6)" : "rgba(107,106,103,0.6)" }}>
                    选中笔记暂无标签
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {editor.batchTagList.map((tag) => (
                      <motion.button
                        key={tag}
                        onClick={() => { editor.onBatchRemoveTag?.(tag); setShowBatchTagPopup(false); }}
                        whileTap={{ scale: 0.88 }}
                        transition={springTap}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                        style={{
                          background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                          color: isDark ? "#fca5a5" : "#dc2626",
                        }}
                      >
                        <X size={10} className="inline mr-1" />{tag}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 主 TabBar */}
      <nav className="safe-area-bottom fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2.5rem)] max-w-sm">
        <div className="relative rounded-[2rem] px-2 py-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.15)] overflow-hidden"
          style={{ willChange: 'transform' }}>

          {/* 玻璃效果层 */}
          <div className="absolute inset-0"
            style={{ background: glassBase, backdropFilter: "blur(35px) saturate(200%)", WebkitBackdropFilter: "blur(35px) saturate(200%)" }} />
          <div className="absolute top-0 left-4 right-4 h-[1.5px]" style={{ background: specularTop }} />
          <div className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full"
            style={{ background: `linear-gradient(to right, transparent, rgba(16,185,129,${isDark ? 0.25 : 0.15}) 30%, rgba(16,185,129,${isDark ? 0.12 : 0.08}) 50%, rgba(16,185,129,${isDark ? 0.25 : 0.15}) 70%, transparent)` }} />
          <div className="absolute top-3 bottom-3 left-0 w-[1px] rounded-full"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.3) 30%, rgba(255,255,255,0.1) 70%, transparent)" }} />
          <div className="absolute top-3 bottom-3 right-0 w-[1px] rounded-full"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.3) 30%, rgba(255,255,255,0.1) 70%, transparent)" }} />
          <div className="absolute inset-0 rounded-[2rem] border border-white/25" />
          <div className="absolute inset-[1px] rounded-[2rem] border border-white/70" />
          <div className="absolute inset-x-4 bottom-0 h-4 rounded-full"
            style={{ background: `linear-gradient(to top, rgba(0,0,0,${isDark ? 0.12 : 0.05}), transparent)` }} />

          {/* 按钮区域 — 三模式切换 */}
          <div className="relative z-10 flex items-center w-full">
            {currentPage === "editor" ? (
              /* ========== 编辑器操作模式 ========== */
              <div className="flex items-center justify-center gap-1 w-full py-1">
                {editorActions.map((act) => {
                  if (act.conditional && !editor[act.conditional]) return null;
                  const Icon = act.icon;
                  const disabled = act.disabled && editor[act.disabled];
                  const label = act.getLabel ? act.getLabel(editor.isPinned, editor.isAIAnalyzing) : act.label;
                  const iconClass = act.getIconClass ? act.getIconClass(editor.isPinned) : act.iconClass;
                  const isDanger = act.key === "delete";

                  return (
                    <motion.button
                      key={act.key}
                      ref={act.key === "delete" ? deleteBtnRef : null}
                      aria-label={label}
                      onClick={() => handleActionClick(act)}
                      whileTap={{ scale: 0.88 }}
                      transition={springTap}
                      disabled={disabled}
                      className="relative flex flex-col items-center gap-0.5 py-1.5 px-2.5 min-w-[56px] rounded-xl hover:bg-white/10 transition-colors disabled:opacity-40"
                    >
                      <Icon size={20} className={disabled ? "text-faded-slate/50" : iconClass} />
                      <span className="text-[9px] font-semibold tracking-wide"
                        style={{ color: disabled ? "rgba(163,162,158,0.4)" : (isDanger ? "#f43f5e" : (isDark ? "rgba(163,162,158,0.8)" : "rgba(107,106,103,0.7)")) }}>
                        {label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

            ) : isSelectMode ? (
              /* ========== 选择模式 ========== */
              <div className="flex items-center justify-center gap-0 w-full py-1">
                <motion.button
                  onClick={() => editor.onSelectAll?.()}
                  whileTap={{ scale: 0.88 }}
                  transition={springTap}
                  className="flex flex-col items-center gap-0.5 py-1.5 px-2 min-w-[48px] rounded-xl hover:bg-white/10 transition-colors"
                  aria-label="全选"
                >
                  <span className="text-[9px] font-semibold tracking-wide"
                    style={{ color: isDark ? "rgba(163,162,158,0.8)" : "rgba(107,106,103,0.7)" }}>
                    全选
                  </span>
                </motion.button>
                <motion.div className="relative w-[46px] h-[42px] flex items-center justify-center mr-1">
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
                  <span className="relative z-10 text-sm font-mono font-bold text-emerald drop-shadow-[0_1px_3px_rgba(16,185,129,0.3)]">{editor.selectCount}</span>
                </motion.div>
                {selectActions.map((act) => {
                  if (act.conditional && !editor[act.conditional]) return null;
                  const Icon = act.icon;
                  const label = act.getLabel ? act.getLabel(editor.selectPinState) : act.label;

                  return (
                    <motion.button
                      key={act.key}
                      aria-label={label}
                      onClick={() => handleActionClick(act)}
                      whileTap={{ scale: 0.88 }}
                      transition={springTap}
                      className="relative flex flex-col items-center gap-0.5 py-1.5 px-2.5 min-w-[56px] rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <Icon size={20} className={act.key === "delete" ? "text-rose" : "text-warm-steel/70"} />
                      <span className="text-[9px] font-semibold tracking-wide"
                        style={{ color: isDark ? "rgba(163,162,158,0.8)" : "rgba(107,106,103,0.7)" }}>
                        {label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

            ) : (
              /* ========== 导航模式 ========== */
              <div className="flex items-center justify-around w-full">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = currentPage === tab.key;
                  const showTodoBadge = tab.key === "home" && activeTodoCount > 0;

                  return (
                    <motion.button
                      key={tab.key}
                      aria-label={tab.label}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => onNavigate(tab.key)}
                      whileTap={{ scale: 0.92 }}
                      transition={springTap}
                      className="relative flex items-center justify-center py-2 flex-1 min-h-[46px]"
                    >
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
                        <motion.div
                          animate={isActive ? { scale: 1.12, y: -1 } : { scale: 1, y: 0 }}
                          transition={springIcon}
                          className="relative"
                        >
                          <Icon size={20} className={isActive ? "text-emerald drop-shadow-[0_1px_3px_rgba(16,185,129,0.3)]" : "text-warm-steel/70"} />

                          {showTodoBadge && (
                            <motion.span
                              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springBadge}
                              className="absolute -top-2 -right-2.5 bg-blue-500 text-white text-[9px] font-mono font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5"
                              style={{ boxShadow: "0 1px 4px rgba(59,130,246,0.4)" }}>
                              {activeTodoCount}
                            </motion.span>
                          )}

                          {tab.key === "gallery" && unlockedCount > 0 && (
                            <motion.span
                              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springBadge}
                              className="absolute -top-2 -right-2.5 bg-emerald text-white text-[9px] font-mono font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5"
                              style={{ boxShadow: "0 1px 4px rgba(16,185,129,0.4)" }}>
                              {unlockedCount}
                            </motion.span>
                          )}
                        </motion.div>

                        <motion.span
                          animate={isActive ? { scale: 1.05, y: 0 } : { scale: 1, y: 0 }}
                          transition={springIcon}
                          className="text-[10px] font-semibold tracking-wide"
                          style={{ color: isActive ? (isDark ? "#34d399" : "#059669") : (isDark ? "rgba(163,162,158,0.8)" : "rgba(107,106,103,0.7)") }}>
                          {tab.label}
                        </motion.span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
