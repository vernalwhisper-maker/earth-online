import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, FileText } from "lucide-react";
import useNoteStore from "../store/noteStore";
import NoteCard from "../components/notes/NoteCard";

export default function HomePage({ onNewNote, onEditNote }) {
  const { notes, tags, loading, searchQuery, selectedTag, setSearchQuery, setSelectedTag, getFilteredNotes } =
    useNoteStore();
  const [searchFocused, setSearchFocused] = useState(false);

  const filteredNotes = useMemo(() => getFilteredNotes(), [notes, searchQuery, selectedTag]);

  const filterOptions = useMemo(
    () => ["全部", "今天", "本周", ...tags.filter(Boolean)],
    [tags]
  );

  const showEmpty = notes.length === 0;
  const isLoading = loading && notes.length === 0;
  const showSearchEmpty = notes.length > 0 && filteredNotes.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 pt-4 pb-4"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[1.5rem] font-bold text-deep-ink">地球Online</h1>
      </div>

      {/* Search bar */}
      <div
        className={`relative mb-3 transition-all ${searchFocused ? "scale-[1.02]" : ""}`}
      >
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-faded-slate"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="搜索笔记..."
          className="w-full pl-9 pr-3 py-2.5 bg-surface border border-scribe rounded-btn text-sm text-deep-ink placeholder-faded-slate outline-none focus:ring-2 focus:ring-emerald transition-all"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
        {filterOptions.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`relative whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              selectedTag === tag
                ? "text-emerald"
                : "text-warm-steel hover:text-deep-ink"
            }`}
          >
            {selectedTag === tag && (
              <motion.div
                layoutId="filter-chip"
                className="absolute inset-0 bg-emerald/10 rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tag}</span>
          </button>
        ))}
      </div>

      {/* Note list or empty states */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-10 h-10 border-2 border-emerald/30 border-t-emerald rounded-full animate-spin mb-4" />
            <p className="text-sm text-warm-steel">加载中..</p>
          </motion.div>
        ) : showEmpty ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-xl bg-scribe/30 flex items-center justify-center mb-4">
              <FileText size={28} className="text-faded-slate" />
            </div>
            <p className="text-sm text-warm-steel mb-4">
              写下第一条笔记，开始你的人生旅程
            </p>
            <button
              onClick={onNewNote}
              className="px-5 py-2 border border-emerald text-emerald rounded-btn text-sm font-medium hover:bg-emerald/5 transition-colors"
            >
              开始记录
            </button>
          </motion.div>
        ) : showSearchEmpty ? (
          <motion.div
            key="search-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <p className="text-sm text-warm-steel">没有找到匹配的笔记</p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-3"
          >
            <AnimatePresence>
              {filteredNotes.map((note, i) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.03, type: "spring", stiffness: 200, damping: 25 }}
                >
                  <NoteCard note={note} onClick={() => onEditNote(note.id)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button
        onClick={onNewNote}
        className="fixed bottom-32 right-5 w-14 h-14 bg-emerald rounded-full shadow-fab flex items-center justify-center active:scale-90 transition-transform z-20"
      >
        <Plus size={24} className="text-white" />
      </button>
    </motion.div>
  );
}
