import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import useNoteStore from "./store/noteStore";
import useAchievementStore from "./store/achievementStore";
import useSettingsStore from "./store/settingsStore";
import useTodoStore from "./store/todoStore";
import useFolderStore from "./store/folderStore";
import TabBar from "./components/layout/TabBar";
import UnlockModal from "./components/achievements/UnlockModal";
import AchievementBatchModal from "./components/achievements/AchievementBatchModal";

// 将成就弹窗包装为 motion 组件：AnimatePresence 可直接控制其退出动画并在完成后卸载，
// 避免自定义组件作为直接子元素时残留全屏遮罩拦截点击
const MotionUnlockModal = motion.create(UnlockModal);
const MotionBatchModal = motion.create(AchievementBatchModal);
import ToastContainer from "./components/ui/Toast";
import AIAssistant from "./components/ai/AIAssistant";
import PrivacyConsentModal from "./components/ui/PrivacyConsentModal";
import { hasConsented } from "./utils/privacyConsent";
import { initStats, incrementComponentStat } from "./utils/feedbackReporter";
import { FAB_DEFAULTS, STORAGE_KEY_FAB } from "./config/debugDefaults";

// 页面级代码分割
const HomePage = lazy(() => import("./pages/HomePage"));
const NoteEditorPage = lazy(() => import("./pages/NoteEditorPage"));
const AchievementGalleryPage = lazy(() => import("./pages/AchievementGalleryPage"));
const AchievementDetailPage = lazy(() => import("./pages/AchievementDetailPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
import RemoteConfigProvider from "./components/RemoteConfigProvider";

const PAGE_ORDER = ["home", "settings", "gallery", "achievement-detail"];

const pageVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const darkMode = useSettingsStore((s) => s.darkMode);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const cardExpandAnim = useSettingsStore((s) => s.cardExpandAnim);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [viewingAchievementId, setViewingAchievementId] = useState(null);
  const [settingsSubPage, setSettingsSubPage] = useState(null);
  const [homeSelectMode, setHomeSelectMode] = useState(false);
  const currentPageRef = useRef(currentPage);
  const prevPageRef = useRef(currentPage);
  const settingsSubPageRef = useRef(null);
  const homeSelectModeRef = useRef(false);

  const notes = useNoteStore((s) => s.notes);
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const loadState = useAchievementStore((s) => s.loadState);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const showAIAssistant = useSettingsStore((s) => s.showAIAssistant);
  const setShowAIAssistant = useSettingsStore((s) => s.setShowAIAssistant);

  // 新建/AI按钮调试
  const advancedDebug = useSettingsStore((s) => s.advancedDebug);
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(false);
  const debugFabGlass = useSettingsStore((s) => s.debugFabGlassEnabled) && advancedDebug;
  const [fabParams, setFabParams] = useState(() => {
    try { const r = localStorage.getItem(STORAGE_KEY_FAB); return r ? JSON.parse(r) : FAB_DEFAULTS; } catch { return FAB_DEFAULTS; }
  });
  useEffect(() => {
    const h = (e) => setFabParams(e.detail);
    window.addEventListener("earth-debug-fab-changed", h);
    return () => window.removeEventListener("earth-debug-fab-changed", h);
  }, []);

  const loadTodos = useTodoStore((s) => s.loadAll);
  const lastUnlocked = useAchievementStore((s) => s.lastUnlocked);
  const lastUnlockedBatch = useAchievementStore((s) => s.lastUnlockedBatch);
  const dismissLastUnlocked = useAchievementStore((s) => s.dismissLastUnlocked);
  const dismissBatch = useAchievementStore((s) => s.dismissBatch);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    homeSelectModeRef.current = homeSelectMode;
  }, [homeSelectMode]);

  useEffect(() => {
    settingsSubPageRef.current = settingsSubPage;
  }, [settingsSubPage]);

  // 追踪 AI 助手使用
  useEffect(() => {
    if (showAIAssistant) incrementComponentStat("ai");
  }, [showAIAssistant]);

  useEffect(() => {
    loadNotes();
    loadState();
    loadSettings();
    loadTodos();

    // 初始化使用统计
    initStats();

    // 首次使用：弹出使用须知（无论同意/拒绝都不自动上报，见隐私承诺）
    const consented = hasConsented();
    if (consented === false) {
      // 从未选择过 → 弹出
      setTimeout(() => setShowPrivacyConsent(true), 500);
    }

    useFolderStore.getState().loadFolders();

    import("@capacitor/status-bar").then(({ StatusBar }) => {
      StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setStyle({ style: "DARK" });
      StatusBar.setBackgroundColor({ color: "#f8f7f4" });
    }).catch(() => {});

    let removed = false;
    import("@capacitor/app").then(async ({ App }) => {
      const handle = await App.addListener("backButton", () => {
        const page = currentPageRef.current;
        if (page === "editor") {
          setEditingNoteId(null);
          setCurrentPage("home");
          currentPageRef.current = "home";
        } else if (page === "achievement-detail") {
          setCurrentPage("gallery");
          currentPageRef.current = "gallery";
        } else if (page === "settings" && settingsSubPageRef.current) {
          // 调试三级页面 → 返回更多设置二级页面
          if (settingsSubPageRef.current.startsWith("debug")) {
            setSettingsSubPage("more");
          } else {
            // 其他设置子页面 → 返回设置主页面
            setSettingsSubPage(null);
          }
        } else if (page === "home" && homeSelectModeRef.current) {
          // 主页选择模式中 → 退出选择模式
          setHomeSelectMode(false);
        } else if (page !== "home") {
          setCurrentPage("home");
          currentPageRef.current = "home";
        } else {
          App.exitApp();
        }
      });
      // StrictMode 下 effect 双跑：首个 effect 的监听器在 cleanup 时移除
      if (removed) handle.remove();
    }).catch(() => {});
    return () => { removed = true; };
  }, []);

  useEffect(() => {
    const applyDarkMode = (isDark) => {
      document.documentElement.classList.toggle("dark", isDark);
    };
    if (darkMode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyDarkMode(mq.matches);
      const handler = (e) => applyDarkMode(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      applyDarkMode(darkMode === "dark");
    }
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [reduceMotion]);

  const navigateTo = (page) => {
    prevPageRef.current = currentPage;
    setCurrentPage(page);
    currentPageRef.current = page;
    setEditingNoteId(null);
    setViewingAchievementId(null);

    // 追踪组件使用
    const pageToComp = { editor:"editor", settings:"settings", gallery:"gallery", "achievement-detail":"achievements" };
    const comp = pageToComp[page];
    if (comp) incrementComponentStat(comp);
  };

  const getDirection = (from, to) => {
    if (to === "editor") return 1;
    const idxFrom = PAGE_ORDER.indexOf(from);
    const idxTo = PAGE_ORDER.indexOf(to);
    if (idxFrom === -1 || idxTo === -1) return 1;
    return idxTo > idxFrom ? 1 : -1;
  };

  const renderPage = () => {
    const direction = getDirection(prevPageRef.current, currentPage);
    switch (currentPage) {
      case "home":
        return (
          <motion.div
            key="home"
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <HomePage
              onNewNote={() => { prevPageRef.current = currentPage; setEditingNoteId("new"); setCurrentPage("editor"); }}
              onEditNote={(id) => { prevPageRef.current = currentPage; setEditingNoteId(id); setCurrentPage("editor"); }}
              onViewAchievement={(id) => { prevPageRef.current = currentPage; setViewingAchievementId(id); setCurrentPage("achievement-detail"); }}
              selectMode={homeSelectMode} onSelectModeChange={setHomeSelectMode}
            />
          </motion.div>
        );
      case "editor":
        return (
          <motion.div
            key="editor"
            initial={cardExpandAnim ? { scale: 0.92, y: 40, opacity: 0 } : { x: 120, opacity: 0 }}
            animate={cardExpandAnim ? { scale: 1, y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
            exit={cardExpandAnim ? { scale: 0.92, y: 40, opacity: 0 } : { x: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: cardExpandAnim ? 250 : 300, damping: cardExpandAnim ? 26 : 30 }}
          >
            <NoteEditorPage noteId={editingNoteId} onBack={() => { setEditingNoteId(null); setCurrentPage("home"); }} />
          </motion.div>
        );
      case "gallery":
        return (
          <motion.div
            key="gallery"
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <AchievementGalleryPage onViewAchievement={(id) => { prevPageRef.current = currentPage; setViewingAchievementId(id); setCurrentPage("achievement-detail"); }} />
          </motion.div>
        );
      case "achievement-detail":
        return (
          <motion.div
            key="achievement-detail"
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <AchievementDetailPage achievementId={viewingAchievementId} onBack={() => { prevPageRef.current = currentPage; setCurrentPage("gallery"); }} />
          </motion.div>
        );
      case "settings":
        return (
          <motion.div
            key="settings"
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <SettingsPage settingsSubPage={settingsSubPage} onSubPageChange={setSettingsSubPage} />
          </motion.div>
        );
      default:
        return <HomePage onNewNote={() => setCurrentPage("editor")} />;
    }
  };

  const showTabBar = currentPage !== "editor";

  return (
    <div className="min-h-[100dvh] bg-canvas-warm flex flex-col">
      <main className={"flex-1 overflow-y-auto " + (currentPage === "editor" ? "pt-0 pb-0" : "pt-6 pb-24")}>
        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-emerald border-t-transparent rounded-full animate-spin" /></div>}>
          <AnimatePresence mode="wait">{renderPage()}</AnimatePresence>
        </Suspense>
      </main>

      {/* 浮动按钮 — 放在 <main> 外，不受页面过渡动画影响 */}
      {currentPage === "home" && !editingNoteId && (
        <>
          {showAIAssistant && (
            debugFabGlass ? (
              <AIAssistant noteId={null} notes={notes} fabDebug fabDebugParams={fabParams} />
            ) : (
              <AIAssistant noteId={null} notes={notes} />
            )
          )}
          {debugFabGlass ? (
            <button
              onClick={() => { prevPageRef.current = currentPage; setEditingNoteId("new"); setCurrentPage("editor"); }}
              className="fixed bottom-32 right-5 w-14 h-14 rounded-full flex items-center justify-center"
              aria-label="新建笔记"
              style={{
                background: `rgba(255,255,255,${fabParams.bgOpacity ?? FAB_DEFAULTS.bgOpacity})`,
                backdropFilter: `blur(${fabParams.blurPx ?? FAB_DEFAULTS.blurPx}px) saturate(${fabParams.saturation ?? FAB_DEFAULTS.saturation})`,
                WebkitBackdropFilter: `blur(${fabParams.blurPx ?? FAB_DEFAULTS.blurPx}px) saturate(${fabParams.saturation ?? FAB_DEFAULTS.saturation})`,
                border: `1px solid rgba(255,255,255,${fabParams.borderOpacity ?? FAB_DEFAULTS.borderOpacity})`,
                boxShadow: `0 8px 32px rgba(0,0,0,${fabParams.shadowOpacity ?? FAB_DEFAULTS.shadowOpacity}), inset 0 1px 0 rgba(255,255,255,0.12)`,
              }}
            >
              <Plus size={22} className="text-warm-steel" />
            </button>
          ) : (
            <motion.button
              aria-label="新建笔记"
              onClick={() => { prevPageRef.current = currentPage; setEditingNoteId("new"); setCurrentPage("editor"); }}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="fixed bottom-32 right-5 w-14 h-14 bg-emerald rounded-full flex items-center justify-center z-20"
              style={{ boxShadow: "0 4px 16px rgba(51,144,236,0.4), 0 1px 3px rgba(51,144,236,0.25)", willChange: "transform" }}
            >
              <Plus size={24} className="text-white" />
            </motion.button>
          )}
        </>
      )}

      <TabBar currentPage={currentPage} onNavigate={navigateTo} />

      {/* 成就解锁弹窗：AnimatePresence 直接子元素为 motion 组件（motion.create HOC），
          退出动画完成后正确卸载，不会残留全屏遮罩拦截点击 */}
      <AnimatePresence>
        {lastUnlocked && (
          <MotionUnlockModal
            key={"unlock-" + lastUnlocked.id}
            achievement={lastUnlocked}
            onDismiss={dismissLastUnlocked}
            onViewAll={() => { dismissLastUnlocked(); setCurrentPage("gallery"); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
        {lastUnlockedBatch && lastUnlockedBatch.length > 0 && (
          <MotionBatchModal
            key="batch"
            achievements={lastUnlockedBatch}
            onDismiss={dismissBatch}
            onViewAll={() => { dismissBatch(); setCurrentPage("gallery"); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </AnimatePresence>
      <RemoteConfigProvider currentVersion="1.6.2" debug={false} />
      <ToastContainer />
      <PrivacyConsentModal isOpen={showPrivacyConsent}
        onDone={() => { setShowPrivacyConsent(false); }} />
    </div>
  );
}