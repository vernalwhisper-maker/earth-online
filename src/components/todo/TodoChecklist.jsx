import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Circle, CheckCircle2, Plus, X } from "lucide-react";
import useTodoStore from "../../store/todoStore";
import { TODO_PRIORITIES, TODO_PRIORITY_KEYS } from "../../data/todoTypes";

function getRelativeDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d - now;
  const days = Math.round(diff / 86400000);
  if (days < 0) return "超期" + Math.abs(days) + "天";
  if (days === 0) return "今天";
  if (days === 1) return "明天";
  if (days < 7) return days + "天后";
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export default function TodoChecklist({ noteId }) {
  const { loadByNoteId, addItem, updateItem, toggleItem, removeItem } = useTodoStore();
  const [items, setItems] = useState([]);
  const [newTodoText, setNewTodoText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  const inputRef = useRef(null);
  const versionRef = useRef(0); // forces refresh after mutations

  // Load items when noteId changes, and after any mutation
  useEffect(() => {
    if (!noteId) return;
    let cancelled = false;
    loadByNoteId(noteId).then((loaded) => {
      if (!cancelled) setItems(loaded || []);
    });
    return () => { cancelled = true; };
  }, [noteId, versionRef.current]);

  const refresh = () => {
    versionRef.current++;
    loadByNoteId(noteId).then((loaded) => {
      setItems(loaded || []);
    });
  };

  const handleAdd = async () => {
    const text = newTodoText.trim();
    if (!text) return;
    const existing = items;
    await addItem({ noteId, content: text, sortOrder: existing.length });
    setNewTodoText("");
    refresh();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
  };

  const handleToggle = async (id) => {
    await toggleItem(id);
    refresh();
  };

  const handleRemove = async (id) => {
    await removeItem(id);
    refresh();
  };

  const handleEditStart = (item) => {
    setEditingId(item.id);
    setEditText(item.content);
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) return;
    const item = items.find((i) => i.id === editingId);
    if (item) {
      item.content = text;
      await updateItem(item);
      refresh();
    }
    setEditingId(null);
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleEditSave(); }
    if (e.key === "Escape") { setEditingId(null); }
  };

  const handlePriorityCycle = async (item) => {
    const keys = TODO_PRIORITY_KEYS;
    const idx = keys.indexOf(item.priority);
    const nextKey = keys[(idx + 1) % keys.length];
    item.priority = nextKey;
    await updateItem(item);
    refresh();
  };

  const activeItems = items.filter((i) => !i.isCompleted);
  const completedItems = items.filter((i) => i.isCompleted);
  const progress = items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0;

  return (
    <div className="border-t border-scribe pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-faded-slate">待办清单</h3>
          <span className="text-xs text-faded-slate">{completedItems.length}/{items.length}</span>
        </div>
        {items.length > 0 && (
          <div className="w-20 h-1.5 bg-scribe/30 rounded-full overflow-hidden">
            <div className="h-full bg-emerald rounded-full transition-all duration-500" style={{ width: progress + "%" }} />
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <input ref={inputRef} type="text" value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="添加待办事项..."
          className="flex-1 px-3 py-2 text-sm border border-scribe rounded-input bg-white/60 text-deep-ink placeholder-faded-slate outline-none focus:ring-2 focus:ring-blue-400" />
        <button onClick={handleAdd} disabled={!newTodoText.trim()}
          className="w-9 h-9 flex items-center justify-center rounded-btn bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-40 shrink-0">
          <Plus size={16} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {activeItems.map((item) => (
          <motion.div key={item.id}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 py-1.5 group">
            <button onClick={() => handleToggle(item.id)} className="shrink-0 text-warm-steel hover:text-emerald transition-colors">
              <Circle size={18} />
            </button>
            {editingId === item.id ? (
              <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)}
                onBlur={handleEditSave} onKeyDown={handleEditKeyDown}
                className="flex-1 px-2 py-0.5 text-sm border border-blue-300 rounded bg-white text-deep-ink outline-none" />
            ) : (
              <span onClick={() => handleEditStart(item)} className="flex-1 text-sm text-deep-ink cursor-text">{item.content}</span>
            )}
            {item.dueDate && (
              <span className={"text-[0.65rem] font-mono px-1.5 py-0.5 rounded whitespace-nowrap " + (new Date(item.dueDate) < new Date() ? "bg-rose/10 text-rose" : "bg-scribe/30 text-faded-slate")}>
                {getRelativeDate(item.dueDate)}
              </span>
            )}
            <button onClick={() => handlePriorityCycle(item)}
              className={"shrink-0 " + (TODO_PRIORITIES[item.priority]?.color || "text-faded-slate") + " opacity-0 group-hover:opacity-100 transition-opacity"}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill={item.priority !== "none" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            </button>
            <button onClick={() => handleRemove(item.id)}
              className="shrink-0 text-faded-slate hover:text-rose transition-colors opacity-0 group-hover:opacity-100">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {completedItems.length > 0 && (
        <div className="mt-2">
          <button onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1.5 text-xs text-faded-slate hover:text-warm-steel mb-1">
            <span>已完成 {completedItems.length}</span>
            <motion.span animate={{ rotate: showCompleted ? 180 : 0 }}>▼</motion.span>
          </button>
          <AnimatePresence>
            {showCompleted && completedItems.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 py-1 opacity-50">
                <button onClick={() => handleToggle(item.id)} className="shrink-0 text-emerald"><CheckCircle2 size={18} /></button>
                <span className="flex-1 text-sm text-warm-steel line-through">{item.content}</span>
                <button onClick={() => handleRemove(item.id)} className="shrink-0 text-faded-slate hover:text-rose transition-colors opacity-0 group-hover:opacity-100"><X size={12} /></button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {items.length === 0 && <p className="text-xs text-center text-faded-slate py-4">暂无待办事项，在上方输入并添加</p>}
    </div>
  );
}