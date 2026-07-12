import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import useNoteStore from "./store/noteStore";
import useAchievementStore from "./store/achievementStore";
import useSettingsStore from "./store/settingsStore";
import useTodoStore from "./store/todoStore";
import useFolderStore from "./store/folderStore";
import HomePage from "./pages/HomePage";
import NoteEditorPage from "./pages/NoteEditorPage";
import AchievementGalleryPage from "./pages/AchievementGalleryPage";
import AchievementDetailPage from "./pages/AchievementDetailPage";
import SettingsPage from "./pages/SettingsPage";
import TabBar from "./components/layout/TabBar";
import UnlockModal from "./components/achievements/UnlockModal";
import ToastContainer from "./components/ui/Toast";
import AIAssistant from "./components/ai/AIAssistant";

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
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [viewingAchievementId, setViewingAchievementId] = useState(null);
  const currentPageRef = useRef(currentPage);
  const prevPageRef = useRef(currentPage);

  const notes = useNoteStore((s) => s.notes);
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const loadState = useAchievementStore((s) => s.loadState);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const showAIAssistant = useSettingsStore((s) => s.showAIAssistant);
  const setShowAIAssistant = useSettingsStore((s) => s.setShowAIAssistant);
  const loadTodos = useTodoStore((s) => s.loadAll);
  const lastUnlocked = useAchievementStore((s) => s.lastUnlocked);
  const dismissLastUnlocked = useAchievementStore((s) => s.dismissLastUnlocked);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    loadNotes();
    loadState();
    loadSettings();
    loadTodos();
    useFolderStore.getState().loadFolders();

    import("@capacitor/status-bar").then(({ StatusBar }) => {
      StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setStyle({ style: "DARK" });
      StatusBar.setBackgroundColor({ color: "#f8f7f4" });
    }).catch(() => {});

    import("@capacitor/app").then(({ App }) => {
      App.addListener("backButton", () => {
        const page = currentPageRef.current;
        if (page === "editor") {
          setEditingNoteId(null);
          setCurrentPage("home");
          currentPageRef.current = "home";
        } else if (page === "achievement-detail") {
          setCurrentPage("gallery");
          currentPageRef.current = "gallery";
        } else if (page !== "home") {
          setCurrentPage("home");
          currentPageRef.current = "home";
        } else {
          App.exitApp();
        }
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const navigateTo = (page) => {
    prevPageRef.current = currentPage;
    setCurrentPage(page);
    currentPageRef.current = page;
    setEditingNoteId(null);
    setViewingAchievementId(null);
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
            />
          </motion.div>
        );
      case "editor":
        return (
          <motion.div
            key="editor"
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
            <SettingsPage />
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
        <AnimatePresence mode="wait">{renderPage()}</AnimatePresence>
      </main>

      {/* 浮动按钮 — 放在 <main> 外，不受页面过渡动画影响 */}
      {currentPage === "home" && !editingNoteId && (
        <>
          {showAIAssistant && <AIAssistant noteId={null} notes={notes} />}
          <motion.button
            onClick={() => { prevPageRef.current = currentPage; setEditingNoteId("new"); setCurrentPage("editor"); }}
            whileTap={{ scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="fixed bottom-32 right-5 w-14 h-14 bg-emerald rounded-full shadow-fab flex items-center justify-center z-20"
            style={{ willChange: 'transform' }}
          >
            <Plus size={24} className="text-white" />
          </motion.button>
        </>
      )}

      {showTabBar && <TabBar currentPage={currentPage} onNavigate={navigateTo} />}

      <AnimatePresence>
        {lastUnlocked && (
          <UnlockModal achievement={lastUnlocked} onDismiss={dismissLastUnlocked}
            onViewAll={() => { dismissLastUnlocked(); setCurrentPage("gallery"); }} />
        )}
      </AnimatePresence>
      <ToastContainer />
    </div>
  );
}