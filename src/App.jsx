import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import useNoteStore from "./store/noteStore";
import useAchievementStore from "./store/achievementStore";
import useSettingsStore from "./store/settingsStore";
import useTodoStore from "./store/todoStore";
import { restoreScheduledReminders } from "./utils/notifications";
import useFolderStore from "./store/folderStore";
import HomePage from "./pages/HomePage";
import NoteEditorPage from "./pages/NoteEditorPage";
import AchievementGalleryPage from "./pages/AchievementGalleryPage";
import AchievementDetailPage from "./pages/AchievementDetailPage";
import SettingsPage from "./pages/SettingsPage";
import TabBar from "./components/layout/TabBar";
import UnlockModal from "./components/achievements/UnlockModal";
import ToastContainer from "./components/ui/Toast";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const darkMode = useSettingsStore((s) => s.darkMode);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [viewingAchievementId, setViewingAchievementId] = useState(null);
  const currentPageRef = useRef(currentPage);

  const loadNotes = useNoteStore((s) => s.loadNotes);
  const loadState = useAchievementStore((s) => s.loadState);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
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
    // 恢复未触发的 Web 提醒定时器
    restoreScheduledReminders();

    // 启动时主动创建原生通知频道 + 请求通知权限
    import("@capacitor/local-notifications").then(({ LocalNotifications }) => {
      LocalNotifications.createChannel({
        id: "earth-online-reminders",
        name: "笔记提醒",
        description: "地球Online 笔记提醒",
        importance: 5,
        visibility: 1,
        sound: "default",
        vibration: true,
      }).then(() => {
        // 静默请求通知权限（用户会看到系统弹窗）
        LocalNotifications.requestPermissions().catch(() => {});
      }).catch(() => {});
    }).catch(() => {});

    import("@capacitor/status-bar").then(({ StatusBar }) => {
      StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setStyle({ style: "DARK" });
      StatusBar.setBackgroundColor({ color: "#f8f7f4" });
    }).catch(() => {});

    import("@capacitor/app").then(({ App }) => {
      App.addListener("backButton", () => {
        const page = currentPageRef.current;
        if (page === "editor") {
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
    setCurrentPage(page);
    currentPageRef.current = page;
    setEditingNoteId(null);
    setViewingAchievementId(null);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return (
          <HomePage
            onNewNote={() => { setEditingNoteId("new"); setCurrentPage("editor"); }}
            onEditNote={(id) => { setEditingNoteId(id); setCurrentPage("editor"); }}
            onViewAchievement={(id) => { setViewingAchievementId(id); setCurrentPage("achievement-detail"); }}
          />
        );
      case "editor":
        return <NoteEditorPage noteId={editingNoteId} onBack={() => setCurrentPage("home")} />;
      case "gallery":
        return <AchievementGalleryPage onViewAchievement={(id) => { setViewingAchievementId(id); setCurrentPage("achievement-detail"); }} />;
      case "achievement-detail":
        return <AchievementDetailPage achievementId={viewingAchievementId} onBack={() => setCurrentPage("gallery")} />;
      case "settings":
        return <SettingsPage />;
      default:
        return <HomePage onNewNote={() => setCurrentPage("editor")} />;
    }
  };

  const showTabBar = currentPage !== "editor";

  return (
    <div className="min-h-[100dvh] bg-canvas-warm flex flex-col">
      <main className="flex-1 overflow-y-auto pt-6 pb-24">
        <AnimatePresence mode="wait">{renderPage()}</AnimatePresence>
      </main>
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