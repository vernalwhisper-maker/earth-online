import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Settings, FileText, Trophy, Sparkles, Trash2, X, RefreshCw, Archive, Folder as FolderIcon, Plus } from "lucide-react";
import useSettingsStore from "../store/settingsStore";
import useNoteStore from "../store/noteStore";
import useFolderStore from "../store/folderStore";
import { DEFAULT_FOLDERS } from "../data/noteTypes";
import { getDeletedNotes, restoreNote, permanentDeleteNote } from "../db";
import { getChatStats, clearAllChatHistory, getAllChatMessages } from "../db";

import GlassSwitch from "../components/ui/GlassSwitch";
import AISettingsPage from "./subpages/AISettingsPage";
import MoreSettingsPage from "./subpages/MoreSettingsPage";

export default function SettingsPage({ settingsSubPage, onSubPageChange }) {
  const { loaded, darkMode, setDarkMode } = useSettingsStore();
  const [subPage, setSubPage] = useState(settingsSubPage || null);
  const loadNotes = useNoteStore((s) => s.loadNotes);

  // 当 settingsSubPage 被外部（返回键）清空时，同步内部状态
  useEffect(() => {
    if (settingsSubPage === null && subPage !== null) {
      setSubPage(null);
    }
  }, [settingsSubPage]);

  // 子页面变化时通知父组件
  const navigateTo = (page) => {
    setSubPage(page);
    onSubPageChange?.(page);
  };

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
  if (subPage === "ai") return <AISettingsPage onBack={() => { setSubPage(null); onSubPageChange?.(null); }} />;
  if (subPage === "more") return <MoreSettingsPage onBack={() => { setSubPage(null); onSubPageChange?.(null); }} />;

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
      <button onClick={() => navigateTo("ai")}
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

      {/* 更多设置按钮 */}
      <button onClick={() => navigateTo("more")}
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

      {/* 显示设置 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate">{"显示设置"}</h2>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-deep-ink">{"深色模式"}</span>
          <GlassSwitch
            value={darkMode}
            onChange={setDarkMode}
            ariaLabel="深色模式"
          />
        </div>
      </section>

      {/* 数据管理 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Archive size={16} className="text-faded-slate" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate">数据管理</h2>
        </div>
        <div className="space-y-2">
          <button onClick={() => setShowRecycleBin(!showRecycleBin)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-btn hover:bg-canvas-warm transition-colors">
            <span className="text-sm text-warm-steel">回收站</span>
            <Trash2 size={14} className="text-faded-slate" />
          </button>
          <button onClick={() => setShowFolderManager(!showFolderManager)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-btn hover:bg-canvas-warm transition-colors">
            <span className="text-sm text-warm-steel">文件夹管理</span>
            <FolderIcon size={14} className="text-faded-slate" />
          </button>
          <button onClick={async () => {
            setShowChatHistory(true); setLoadingChatHistory(true);
            const msgs = await getAllChatMessages();
            setChatHistory(msgs); setLoadingChatHistory(false);
          }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-btn hover:bg-canvas-warm transition-colors">
            <span className="text-sm text-warm-steel">聊天历史</span>
            <MessageSquare size={14} className="text-faded-slate" />
          </button>
        </div>
      </section>

      {/* 关于 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-faded-slate" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate">关于</h2>
        </div>
        <p className="text-sm font-mono text-faded-slate">版本 0.2</p>
        <p className="text-sm text-warm-steel mt-1">成就总数: 60</p>
      </section>

      <p className="text-center text-xs text-faded-slate mt-8">地球Online 笔记成就系统</p>

      {/* ====== 回收站面板 ====== */}
      <AnimatePresence>
        {showRecycleBin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-deep-ink">回收站</h3>
                <button onClick={() => setShowRecycleBin(false)} className="p-1 rounded-full hover:bg-scribe/30 transition-colors">
                  <X size={18} className="text-warm-steel" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {loadingRecycle ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-emerald/30 border-t-emerald rounded-full animate-spin" />
                  </div>
                ) : deletedNotes.length === 0 ? (
                  <p className="text-sm text-center text-faded-slate py-8">回收站为空</p>
                ) : (
                  <div className="space-y-2">
                    {deletedNotes.map((note) => (
                      <div key={note.id} className="flex items-center justify-between px-3 py-2.5 rounded-btn bg-canvas-warm">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-sm text-deep-ink truncate">{note.title || "无标题"}</p>
                          <p className="text-xs text-faded-slate">{new Date(note.deletedAt).toLocaleDateString("zh-CN")}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={async () => { await restoreNote(note.id); const n = await getDeletedNotes(); setDeletedNotes(n); }}
                            className="px-2 py-1 text-xs text-emerald bg-emerald/10 rounded-full hover:bg-emerald/20 transition-colors">
                            <RefreshCw size={12} className="inline mr-0.5" />恢复
                          </button>
                          <button onClick={async () => { await permanentDeleteNote(note.id); setDeletedNotes(deletedNotes.filter((n) => n.id !== note.id)); }}
                            className="px-2 py-1 text-xs text-rose bg-rose/10 rounded-full hover:bg-rose/20 transition-colors">
                            <X size={12} className="inline mr-0.5" />删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== 文件夹管理面板 ====== */}
      <AnimatePresence>
        {showFolderManager && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-deep-ink">文件夹管理</h3>
                <button onClick={() => setShowFolderManager(false)} className="p-1 rounded-full hover:bg-scribe/30 transition-colors">
                  <X size={18} className="text-warm-steel" />
                </button>
              </div>
              <div className="space-y-2 mb-4">
                {folders.map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    {editingFolderId === f.id ? (
                      <>
                        <input type="text" value={editingFolderLabel}
                          onChange={(e) => setEditingFolderLabel(e.target.value)}
                          className="flex-1 px-2 py-1.5 text-sm border border-scribe rounded-input outline-none focus:ring-2 focus:ring-emerald" />
                        <button onClick={async () => {
                          if (editingFolderLabel.trim()) {
                            await renameFolder(f.id, editingFolderLabel.trim());
                            setEditingFolderId(null);
                          }
                        }} className="px-2 py-1 text-xs text-emerald rounded-full bg-emerald/10">保存</button>
                        <button onClick={() => setEditingFolderId(null)} className="px-2 py-1 text-xs text-warm-steel">取消</button>
                      </>
                    ) : (
                      <>
                        <FolderIcon size={16} className="text-warm-steel shrink-0" />
                        <span className="flex-1 text-sm text-deep-ink">{f.label}</span>
                        {!f.isDefault && (
                          <>
                            <button onClick={() => { setEditingFolderId(f.id); setEditingFolderLabel(f.label); }}
                              className="text-xs text-warm-steel hover:text-deep-ink">重命名</button>
                            <button onClick={async () => { await removeFolder(f.id); }}
                              className="text-xs text-rose hover:text-rose/80">删除</button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t border-scribe pt-3">
                <input type="text" value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newFolderName.trim()) { addFolder(newFolderName.trim()); setNewFolderName(""); } }}
                  placeholder="新建文件夹名称..."
                  className="flex-1 px-3 py-2 text-sm border border-scribe rounded-input outline-none focus:ring-2 focus:ring-emerald" />
                <button onClick={async () => {
                  if (newFolderName.trim()) { await addFolder(newFolderName.trim()); setNewFolderName(""); }
                }} className="px-4 py-2 bg-emerald text-white rounded-btn text-sm font-medium hover:bg-emerald-dark transition-colors">
                  <Plus size={14} className="inline mr-1" />添加
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== 聊天历史面板 ====== */}
      <AnimatePresence>
        {showChatHistory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-deep-ink">聊天历史</h3>
                <button onClick={() => setShowChatHistory(false)} className="p-1 rounded-full hover:bg-scribe/30 transition-colors">
                  <X size={18} className="text-warm-steel" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {loadingChatHistory ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-emerald/30 border-t-emerald rounded-full animate-spin" />
                  </div>
                ) : chatHistory.length === 0 ? (
                  <p className="text-sm text-center text-faded-slate py-8">暂无聊天记录</p>
                ) : (
                  <div className="space-y-1">
                    {chatHistory.slice(-20).map((msg) => (
                      <div key={msg.id} className="px-3 py-2 rounded-btn bg-canvas-warm text-sm">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={"text-xs font-mono " + (msg.role === "user" ? "text-emerald" : "text-violet-500")}>
                            {msg.role === "user" ? "\u{1F464}" : "\u{1F916}"}
                          </span>
                          <span className="text-xs text-faded-slate">{new Date(msg.timestamp).toLocaleString("zh-CN")}</span>
                        </div>
                        <p className="text-warm-steel break-words">{(msg.content || "").slice(0, 120)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-scribe pt-3 mt-3">
                <button onClick={() => setShowClearChatConfirm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-rose rounded-btn hover:bg-rose/5 transition-colors">
                  <Trash2 size={14} />清除所有聊天记录
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== 清除聊天确认弹窗 ====== */}
      <AnimatePresence>
        {showClearChatConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-[60] px-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft">
              <h3 className="text-lg font-bold text-deep-ink mb-2">确认清除</h3>
              <p className="text-sm text-warm-steel mb-6">将删除所有 AI 对话记录，此操作不可撤销。</p>
              <div className="flex gap-3">
                <button onClick={() => setShowClearChatConfirm(false)}
                  className="flex-1 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink">取消</button>
                <button onClick={async () => {
                  await clearAllChatHistory();
                  setShowClearChatConfirm(false);
                  setShowChatHistory(false);
                  setChatHistory([]);
                }}
                  className="flex-1 py-2.5 bg-rose text-white rounded-btn text-sm">确认清除</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
