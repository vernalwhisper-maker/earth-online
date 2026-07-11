import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import useNoteStore from "./store/noteStore";
import useAchievementStore from "./store/achievementStore";
import useSettingsStore from "./store/settingsStore";
import HomePage from "./pages/HomePage";
import NoteEditorPage from "./pages/NoteEditorPage";
import AchievementGalleryPage from "./pages/AchievementGalleryPage";
import AchievementDetailPage from "./pages/AchievementDetailPage";
import SettingsPage from "./pages/SettingsPage";
import TabBar from "./components/layout/TabBar";
import UnlockModal from "./components/achievements/UnlockModal";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [viewingAchievementId, setViewingAchievementId] = useState(null);
  const currentPageRef = useRef(currentPage);

  const loadNotes = useNoteStore((s) => s.loadNotes);
  const loadState = useAchievementStore((s) => s.loadState);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const lastUnlocked = useAchievementStore((s) => s.lastUnlocked);
  const dismissLastUnlocked = useAchievementStore((s) => s.dismissLastUnlocked);

  // Keep ref in sync for back button handler
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Initial load + native plugins setup
  useEffect(() => {
    loadNotes();
    loadState();
    loadSettings();

    // Status bar (only on native)
    import("@capacitor/status-bar").then(({ StatusBar }) => {
      StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setStyle({ style: "DARK" });
      StatusBar.setBackgroundColor({ color: "#f8f7f4" });
    }).catch(() => {});

    // Android back button
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
            onNewNote={() => {
              setEditingNoteId("new");
              setCurrentPage("editor");
            }}
            onEditNote={(id) => {
              setEditingNoteId(id);
              setCurrentPage("editor");
            }}
            onViewAchievement={(id) => {
              setViewingAchievementId(id);
              setCurrentPage("achievement-detail");
            }}
          />
        );
      case "editor":
        return (
          <NoteEditorPage
            noteId={editingNoteId}
            onBack={() => setCurrentPage("home")}
          />
        );
      case "gallery":
        return (
          <AchievementGalleryPage
            onViewAchievement={(id) => {
              setViewingAchievementId(id);
              setCurrentPage("achievement-detail");
            }}
          />
        );
      case "achievement-detail":
        return (
          <AchievementDetailPage
            achievementId={viewingAchievementId}
            onBack={() => setCurrentPage("gallery")}
          />
        );
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
          <UnlockModal
            achievement={lastUnlocked}
            onDismiss={dismissLastUnlocked}
            onViewAll={() => {
              dismissLastUnlocked();
              setCurrentPage("gallery");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
