import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  Search, Plus, FileText, Inbox, User, Briefcase, BookOpen, Archive,
  FileText as FTI, CheckSquare, Award, StickyNote, Trash2, Folder, Pin,
  X, CheckCircle,
} from "lucide-react";
import useNoteStore from "../store/noteStore";
import NoteCard from "../components/notes/NoteCard";
import { NOTE_TYPES, NOTE_TYPE_KEYS, DEFAULT_FOLDERS } from "../data/noteTypes";
import useFolderStore from "../store/folderStore";
import { getSearchHistory, saveSearchQuery, clearSearchHistory } from "../db";
import AIAssistant from "../components/ai/AIAssistant";

const TYPE_ICONS = { journal: FTI, todo: CheckSquare, milestone: Award, flashcard: StickyNote };
const FOLDER_ICONS = { inbox: Inbox, personal: User, work: Briefcase, study: BookOpen, archive: Archive };

export default function HomePage({ onNewNote, onEditNote }) {
  const { notes, tags, loading, searchQuery, selectedTag, selectedType, selectedFolder,
    setSearchQuery, setSelectedTag, setSelectedType, setSelectedFolder, getFilteredNotes, saveNote, deleteNote } = useNoteStore();

  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const searchRef = useRef(null);
  const { loadFolders } = useFolderStore();

  // Selection mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const longPressTimer = useRef(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  // Calculate pin state of selected notes
  const pinState = useMemo(() => {
    if (selectedIds.size === 0) return "none";
    const sel = notes.filter((n) => selectedIds.has(n.id));
    const allPinned = sel.every((n) => n.isPinned);
    if (allPinned) return "all_pinned";
    if (sel.every((n) => !n.isPinned)) return "none_pinned";
    return "mixed";
  }, [selectedIds, notes]);

  const filteredNotes = useMemo(() => getFilteredNotes(), [notes, searchQuery, selectedTag, selectedType, selectedFolder]);

  const filterOptions = useMemo(() => ["全部", "今天", "本周", ...tags.filter(Boolean)], [tags]);

  useEffect(() => { loadFolders(); }, []);

  useEffect(() => {
    if (searchFocused) getSearchHistory(5).then(setRecentSearches);
  }, [searchFocused]);

  const handleSearch = (query) => { setSearchQuery(query); };
  const commitSearch = (query) => {
    const q = (query || searchQuery).trim();
    if (!q) return;
    saveSearchQuery(q);
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.query !== q);
      return [{ id: "temp", query: q, timestamp: new Date().toISOString() }, ...filtered].slice(0, 5);
    });
  };

  const showEmpty = notes.length === 0;
  const isLoading = loading && notes.length === 0;
  const showSearchEmpty = notes.length > 0 && filteredNotes.length === 0;

  // Selection handlers
  const startLongPress = (id) => {
    longPressTimer.current = setTimeout(() => {
      setSelectMode(true);
      setSelectedIds(new Set([id]));
      longPressTimer.current = null;
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) { setSelectMode(false); }
      return next;
    });
  };
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const batchDelete = async () => {
    for (const id of selectedIds) await deleteNote(id);
    exitSelectMode();
  };
  const batchMoveToFolder = async (folderId) => {
    const store = useNoteStore.getState();
    for (const id of selectedIds) {
      const note = notes.find((n) => n.id === id);
      if (note) { note.folderId = folderId; await store.saveNote(note); }
    }
    setShowMoveDialog(false);
    exitSelectMode();
  };
  const batchTogglePin = async () => {
    const store = useNoteStore.getState();
    for (const id of selectedIds) {
      const note = notes.find((n) => n.id === id);
      if (note) { note.isPinned = !note.isPinned; await store.saveNote(note); }
    }
    exitSelectMode();
  };

  const groupedByType = useMemo(() => {
    const groups = {};
    for (const key of NOTE_TYPE_KEYS) {
      const typeNotes = filteredNotes.filter((n) => n.noteType === key);
      if (typeNotes.length > 0) groups[key] = typeNotes;
    }
    return groups;
  }, [filteredNotes]);

  const groupedByFolder = useMemo(() => {
    const groups = {};
    for (const note of filteredNotes) {
      const fid = note.folderId || "inbox";
      if (!groups[fid]) groups[fid] = [];
      groups[fid].push(note);
    }
    return groups;
  }, [filteredNotes]);

  const renderNoteList = (notesList) => (
    <AnimatePresence>
      {notesList.map((note, i) => (
        <motion.div key={note.id}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ delay: i * 0.03, type: "spring", stiffness: 200, damping: 25 }}>
          <div
            onMouseDown={() => startLongPress(note.id)}
            onMouseUp={cancelLongPress}
            onMouseLeave={cancelLongPress}
            onTouchStart={() => startLongPress(note.id)}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
            onClick={() => {
              if (selectMode) { toggleSelect(note.id); }
              else { onEditNote(note.id); }
            }}
            className="relative">
            {/* Selection checkbox */}
            {selectMode && (
              <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                <div className={"w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors " +
                  (selectedIds.has(note.id) ? "bg-emerald border-emerald" : "bg-white border-scribe")}>
                  {selectedIds.has(note.id) && <CheckCircle size={14} className="text-white" />}
                </div>
              </div>
            )}
            <div className={selectMode ? "ml-8" : ""}>
              <NoteCard note={note} onClick={() => {}} />
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );

  const searchDropdown = searchFocused && !searchQuery && recentSearches.length > 0 && searchRef.current ? (
    createPortal(
      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
        className="fixed z-[99999] bg-surface border border-scribe rounded-card shadow-soft overflow-hidden"
        style={{ top: (searchRef.current?.getBoundingClientRect().bottom || 0) + 4, left: searchRef.current?.getBoundingClientRect().left || 0, width: searchRef.current?.offsetWidth || 300 }}
        onMouseDown={(e) => e.preventDefault()}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-scribe/50">
          <span className="text-[0.65rem] font-mono text-faded-slate">最近搜索</span>
          <button onClick={() => { clearSearchHistory(); setRecentSearches([]); }}
            className="text-[0.65rem] text-faded-slate hover:text-rose transition-colors">清除</button>
        </div>
        {recentSearches.map((s) => (
          <button key={s.id} onClick={() => { setSearchQuery(s.query); }}
            className="w-full text-left px-3 py-2 text-sm text-warm-steel hover:bg-canvas-warm transition-colors">{s.query}</button>
        ))}
      </motion.div>,
      document.body
    )
  ) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {selectMode ? (
          <>
            <button onClick={exitSelectMode} className="flex items-center gap-1 text-sm text-warm-steel">
              <X size={16} />取消
            </button>
            <span className="text-sm font-medium text-deep-ink">已选 {selectedIds.size} 项</span>
            <div className="w-12" />
          </>
        ) : (
          <>
            <h1 className="text-[1.5rem] font-bold text-deep-ink">地球Online</h1>
            <div className="flex gap-1 bg-scribe/30 rounded-full p-0.5">
              {["list", "type", "folder"].map((mode) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className={"px-2.5 py-1 text-xs rounded-full transition-colors " + (viewMode === mode ? "bg-white text-deep-ink shadow-sm" : "text-faded-slate")}>
                  {mode === "list" ? "列表" : mode === "type" ? "分类" : "文件夹"}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-surface rounded-card border border-scribe p-2.5 text-center">
          <p className="text-xs text-faded-slate">笔记</p>
          <p className="text-lg font-bold text-deep-ink">{notes.length}</p>
        </div>
        <div className="bg-surface rounded-card border border-scribe p-2.5 text-center">
          <p className="text-xs text-faded-slate">标签</p>
          <p className="text-lg font-bold text-amber-500">{tags.length}</p>
        </div>
        <div className="bg-surface rounded-card border border-scribe p-2.5 text-center">
          <p className="text-xs text-faded-slate">已置顶</p>
          <p className="text-lg font-bold text-violet-500">{notes.filter(n => n.isPinned).length}</p>
        </div>
      </div>

      {/* Search bar (hide in select mode) */}
      {!selectMode && (
        <div className="relative mb-3" ref={searchRef}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faded-slate" />
          <input type="text" value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => { commitSearch(); setSearchFocused(false); }, 200)}
            onKeyDown={(e) => { if (e.key === "Enter") commitSearch(); }}
            placeholder="搜索笔记..."
            className="w-full pl-9 pr-3 py-2.5 bg-surface border border-scribe rounded-btn text-sm text-deep-ink placeholder-faded-slate outline-none focus:ring-2 focus:ring-emerald transition-all" />
          {searchDropdown}
        </div>
      )}

      {/* Filter chips */}
      {!selectMode && viewMode === "list" && (
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
          {filterOptions.map((tag) => (
            <button key={tag} onClick={() => setSelectedTag(tag)}
              className={"relative whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-full transition-colors " + (selectedTag === tag ? "text-emerald" : "text-warm-steel hover:text-deep-ink")}>
              {selectedTag === tag && <motion.div layoutId="filter-chip" className="absolute inset-0 bg-emerald/10 rounded-full" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
              <span className="relative z-10">{tag}</span>
            </button>
          ))}
        </div>
      )}
      {!selectMode && viewMode === "type" && (
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
          <button onClick={() => setSelectedType(null)}
            className={"relative whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-full " + (!selectedType ? "text-emerald bg-emerald/10" : "text-warm-steel hover:text-deep-ink")}>全部</button>
          {NOTE_TYPE_KEYS.map((key) => {
            const t = NOTE_TYPES[key]; const Icon = TYPE_ICONS[key]; const isActive = selectedType === key;
            return (<button key={key} onClick={() => setSelectedType(isActive ? null : key)}
              className={"inline-flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-full transition-colors " + (isActive ? t.color + " text-white" : "text-warm-steel hover:text-deep-ink")}>
              <Icon size={12} />{t.label}</button>);
          })}
        </div>
      )}
      {!selectMode && viewMode === "folder" && (
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
          <button onClick={() => setSelectedFolder(null)}
            className={"relative whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-full " + (!selectedFolder ? "text-emerald bg-emerald/10" : "text-warm-steel hover:text-deep-ink")}>全部</button>
          {DEFAULT_FOLDERS.map((f) => {
            const Icon = FOLDER_ICONS[f.id] || Inbox; const isActive = selectedFolder === f.id;
            return (<button key={f.id} onClick={() => setSelectedFolder(isActive ? null : f.id)}
              className={"inline-flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-full transition-colors " + (isActive ? "bg-deep-ink text-white" : "text-warm-steel hover:text-deep-ink")}>
              <Icon size={12} />{f.label}</button>);
          })}
        </div>
      )}

      {/* Note list */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" className="flex flex-col gap-3 py-4">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-surface rounded-card border border-scribe p-4 animate-pulse">
                <div className="h-4 bg-scribe/50 rounded w-3/4 mb-3" />
                <div className="h-3 bg-scribe/30 rounded w-full mb-2" />
                <div className="h-3 bg-scribe/30 rounded w-2/3" />
              </div>
            ))}
          </motion.div>
        ) : showEmpty ? (
          <motion.div key="empty" className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-xl bg-scribe/30 flex items-center justify-center mb-4"><FileText size={28} className="text-faded-slate" /></div>
            <p className="text-sm text-warm-steel mb-4">写下第一条笔记，开始你的人生旅程</p>
            <button onClick={onNewNote} className="px-5 py-2 border border-emerald text-emerald rounded-btn text-sm font-medium hover:bg-emerald/5 transition-colors">开始记录</button>
          </motion.div>
        ) : showSearchEmpty ? (
          <motion.div key="search-empty" className="text-center py-16"><p className="text-sm text-warm-steel">没有找到匹配的笔记</p></motion.div>
        ) : viewMode === "type" ? (
          <motion.div key="type-view" initial="hidden" animate="visible" className="flex flex-col gap-6">
            {NOTE_TYPE_KEYS.map((key) => {
              const group = groupedByType[key]; if (!group) return null;
              const t = NOTE_TYPES[key]; const Icon = TYPE_ICONS[key];
              return (<div key={key}><div className="flex items-center gap-2 mb-3"><Icon size={14} className={t.textColor} /><h2 className="text-sm font-semibold text-deep-ink">{t.label}</h2><span className="text-xs text-faded-slate font-mono">{group.length}</span></div><div className="flex flex-col gap-2">{renderNoteList(group)}</div></div>);
            })}
          </motion.div>
        ) : viewMode === "folder" ? (
          <motion.div key="folder-view" initial="hidden" animate="visible" className="flex flex-col gap-6">
            {DEFAULT_FOLDERS.map((f) => {
              const group = groupedByFolder[f.id]; if (!group) return null;
              const Icon = FOLDER_ICONS[f.id] || Inbox;
              return (<div key={f.id}><div className="flex items-center gap-2 mb-3"><Icon size={14} className="text-warm-steel" /><h2 className="text-sm font-semibold text-deep-ink">{f.label}</h2><span className="text-xs text-faded-slate font-mono">{group.length}</span></div><div className="flex flex-col gap-2">{renderNoteList(group)}</div></div>);
            })}
          </motion.div>
        ) : (
          <motion.div key="list" initial="hidden" animate="visible" className="flex flex-col gap-3">{renderNoteList(filteredNotes)}</motion.div>
        )}
      </AnimatePresence>

      {/* FAB — hide in select mode */}
      {!selectMode && (
        <>
          <AIAssistant noteId={null} notes={notes} />
          <motion.button onClick={onNewNote}
            whileTap={{ scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="fixed bottom-32 right-5 w-14 h-14 bg-emerald rounded-full shadow-fab flex items-center justify-center z-20"
            style={{ willChange: 'transform' }}>
            <Plus size={24} className="text-white" />
          </motion.button>
        </>
      )}

      {/* Bottom action bar in select mode */}
      <AnimatePresence>
        {selectMode && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-surface border-t border-scribe px-4 py-3 z-50 safe-area-bottom">
            <div className="flex items-center justify-around max-w-md mx-auto">
              <button onClick={batchDelete} className="flex flex-col items-center gap-1 px-4 py-2 text-rose">
                <Trash2 size={20} /><span className="text-[0.65rem]">删除</span>
              </button>
              <button onClick={() => setShowMoveDialog(true)} className="flex flex-col items-center gap-1 px-4 py-2 text-warm-steel">
                <Folder size={20} /><span className="text-[0.65rem]">移动</span>
              </button>
              <button onClick={batchTogglePin} className="flex flex-col items-center gap-1 px-4 py-2 text-warm-steel">
                <Pin size={20} fill={pinState === "all_pinned" ? "currentColor" : "none"} /><span className="text-[0.65rem]">{pinState === "all_pinned" ? "取消置顶" : "切换置顶"}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move to folder dialog */}
      {showMoveDialog && (
        <div className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft">
            <h3 className="text-lg font-bold text-deep-ink mb-4">移动到文件夹</h3>
            <div className="space-y-1">
              {DEFAULT_FOLDERS.map((f) => {
                const Icon = FOLDER_ICONS[f.id] || Inbox;
                return (<button key={f.id} onClick={() => batchMoveToFolder(f.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-btn hover:bg-canvas-warm text-left transition-colors">
                  <Icon size={16} className="text-warm-steel" /><span className="text-sm text-deep-ink">{f.label}</span>
                </button>);
              })}
            </div>
            <button onClick={() => setShowMoveDialog(false)} className="w-full mt-4 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink hover:bg-canvas-warm transition-colors">取消</button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
