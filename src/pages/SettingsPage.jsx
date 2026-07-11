import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Bell, Settings, FileText, Trophy, Sparkles, Trash2, X, RefreshCw, Archive, Folder as FolderIcon } from "lucide-react";
import useSettingsStore from "../store/settingsStore";
import useNoteStore from "../store/noteStore";
import useFolderStore from "../store/folderStore";
import { DEFAULT_FOLDERS } from "../data/noteTypes";
import { getDeletedNotes, restoreNote, permanentDeleteNote } from "../db";
import { getChatStats, clearAllChatHistory, getAllChatMessages } from "../db";

import AISettingsPage from "./subpages/AISettingsPage";
import NotificationSettingsPage from "./subpages/NotificationSettingsPage";
import MoreSettingsPage from "./subpages/MoreSettingsPage";

export default function SettingsPage() {
  const { loaded } = useSettingsStore();
  const [subPage, setSubPage] = useState(null);
  const loadNotes = useNoteStore((s) => s.loadNotes);

  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [deletedNotes, setDeletedNotes] = useState([]);
  const [loadingRecycle, setLoadingRecycle] = useState(false);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderLabel, setEditingFolderLabel] = useState("");
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingChatHistory, setLoadingChatHistory] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);

  const { folders, addFolder, renameFolder, removeFolder } = useFolderStore();

  useEffect(() => {
    if (showRecycleBin) { setLoadingRecycle(true); getDeletedNotes().then((n) => { setDeletedNotes(n); setLoadingRecycle(false); }); }
  }, [showRecycleBin]);

  useEffect(() => {
    if (showFolderManager) useFolderStore.getState().loadFolders();
  }, [showFolderManager]);

  // Sub-page navigation
  if (subPage === "ai") return <AISettingsPage onBack={() => setSubPage(null)} />;
  if (subPage === "notification") return <NotificationSettingsPage onBack={() => setSubPage(null)} />;
  if (subPage === "more") return <MoreSettingsPage onBack={() => setSubPage(null)} />;

  if (!loaded) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="px-4 pt-4 pb-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-emerald/30 border-t-emerald rounded-full animate-spin mb-4" />
        <p className="text-sm text-warm-steel">加载设置中...</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="px-4 pt-4 pb-6 max-w-2xl mx-auto">
      <h1 className="text-[1.5rem] font-bold text-deep-ink mb-6">设置</h1>

      {/* AI 设置按钮 */}
      <button onClick={() => setSubPage("ai")}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-surface rounded-card border border-scribe text-left hover:bg-canvas-warm transition-colors mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Sparkles size={20} className="text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-deep-ink">AI 设置</p>
            <p className="text-xs text-faded-slate">模型、推理参数、聊天记录</p>
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-faded-slate"><path d="m9 18 6-6-6-6"/></svg>
      </button>

      {/* 通知设置按钮 */}
      <button onClick={() => setSubPage("notification")}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-surface rounded-card border border-scribe text-left hover:bg-canvas-warm transition-colors mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Bell size={20} className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-deep-ink">通知设置</p>
            <p className="text-xs text-faded-slate">笔记提醒、通知权限</p>
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-faded-slate"><path d="m9 18 6-6-6-6"/></svg>
      </button>

      {/* 更多设置按钮 */}
      <button onClick={() => setSubPage("more")}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-surface rounded-card border border-scribe text-left hover:bg-canvas-warm transition-colors mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center">
            <Settings size={20} className="text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-deep-ink">更多设置</p>
            <p className="text-xs text-faded-slate">导航栏、数据管理、回收站</p>
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-faded-slate"><path d="m9 18 6-6-6-6"/></svg>
      </button>

      {/* 关于 — 直接显示在主页 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-faded-slate" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate">关于</h2>
        </div>
        <p className="text-sm font-mono text-faded-slate">版本 0.2</p>
        <p className="text-sm text-warm-steel mt-1">成就总数: 60</p>

      </section>

      <p className="text-center text-xs text-faded-slate mt-8">地球Online 笔记成就系统</p>
    </motion.div>
  );
}
