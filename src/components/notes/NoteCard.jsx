import { motion } from "framer-motion";
import { Pin, Bell, FileText, CheckSquare, Award, StickyNote } from "lucide-react";
import { NOTE_TYPES } from "../../data/noteTypes";
import useTodoStore from "../../store/todoStore";

function getRelativeTime(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return diffMin + "分钟前";
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return diffHour + "小时前";
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return diffDay + "天前";
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) return diffWeek + "周前";
  return date.toLocaleDateString("zh-CN");
}

const TYPE_ICONS = {
  journal: FileText,
  todo: CheckSquare,
  milestone: Award,
  flashcard: StickyNote,
};

export default function NoteCard({ note, onClick }) {
  const typeDef = NOTE_TYPES[note.noteType] || NOTE_TYPES.journal;
  const TypeIcon = TYPE_ICONS[note.noteType] || FileText;
  const hasReminder = !!note.reminderDate;
  const isTodo = note.noteType === "todo";

  // Get todo stats directly from the store
  const byNote = useTodoStore((s) => s.byNoteId[note.id]);
  const todoList = byNote || [];
  const todoStats = { total: todoList.length, completed: todoList.filter((i) => i.isCompleted).length };

  return (
    <motion.button
      layout
      onClick={onClick}
      className="w-full bg-surface border border-scribe rounded-card p-4 text-left hover:bg-canvas-warm transition-colors relative overflow-hidden"
    >
      {note.isPinned && (
        <div className="absolute top-0 right-0 w-12 h-12">
          <div className="absolute top-2 right-2 text-emerald"><Pin size={14} fill="currentColor" /></div>
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={"inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6875rem] font-medium " + typeDef.textColor + " bg-white/80"}>
          <TypeIcon size={10} />{typeDef.label}
        </span>
        {note.contentMarkdown && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6875rem] font-medium bg-emerald/10 text-emerald">
            MD
          </span>
        )}
        {note.bgPattern && note.bgPattern !== "solid" && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6875rem] font-medium bg-violet-500/10 text-violet-500">
            {note.bgPattern === "grid" ? "▦" : note.bgPattern === "dot" ? "‥" : "≡"}
          </span>
        )}
      </div>

      <h3 className="text-base font-semibold text-deep-ink line-clamp-2 mb-1 pr-6">
        {note.title || "无标题"}
      </h3>

      {note.body && !isTodo && (
        <p className="text-sm text-warm-steel line-clamp-1 mb-3">{note.body}</p>
      )}

      {/* Todo progress bar */}
      {isTodo && todoStats.total > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 bg-scribe/30 rounded-full overflow-hidden">
            <div className="h-full bg-emerald rounded-full transition-all" style={{ width: Math.round((todoStats.completed / todoStats.total) * 100) + "%" }} />
          </div>
          <span className="text-[0.65rem] font-mono text-faded-slate">{todoStats.completed}/{todoStats.total}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-faded-slate">{getRelativeTime(note.updated_at)}</span>
          {hasReminder && <span className="text-faded-slate" title="设有提醒"><Bell size={10} /></span>}
        </div>
        {(note.tags || []).length > 0 && (
          <div className="flex gap-1.5">
            {note.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-[0.6875rem] font-medium bg-scribe/30 text-warm-steel rounded">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </motion.button>
  );
}

export { getRelativeTime };