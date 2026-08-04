import { motion } from "framer-motion";
import { Pin, Bell, FileText, CheckSquare, Award, StickyNote } from "lucide-react";
import { NOTE_TYPES } from "../../data/noteTypes";
import useTodoStore from "../../store/todoStore";
import { renderLinks } from "../../utils/linkDetect";

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

// 类型化渐变头像（按笔记类型映射，保持稳定配色）
const AVATAR_GRADIENTS = {
  journal: "linear-gradient(135deg, #6cb7f4 0%, #3390ec 100%)",
  todo: "linear-gradient(135deg, #7ed27c 0%, #4fae4e 100%)",
  milestone: "linear-gradient(135deg, #f7c66b 0%, #f59e0b 100%)",
  flashcard: "linear-gradient(135deg, #b39af5 0%, #8b5cf6 100%)",
};
const DEFAULT_GRADIENT = "linear-gradient(135deg, #6cb7f4 0%, #3390ec 100%)";

export default function NoteCard({ note, onClick }) {
  const typeDef = NOTE_TYPES[note.noteType] || NOTE_TYPES.journal;
  const TypeIcon = TYPE_ICONS[note.noteType] || FileText;
  const hasReminder = !!note.reminderDate;
  const isTodo = note.noteType === "todo";

  // Get todo stats directly from the store
  const byNote = useTodoStore((s) => s.byNoteId[note.id]);
  const todoList = byNote || [];
  const todoStats = { total: todoList.length, completed: todoList.filter((i) => i.isCompleted).length };

  const title = note.title || "无标题";
  // 摘要：markdown 笔记用 contentMarkdown，普通笔记用 body
  const snippet = note.contentMarkdown
    ? (note.contentMarkdown || "").replace(/[#>*`\-\[\]()!]/g, "").replace(/\s+/g, " ").slice(0, 60)
    : (note.body || "").slice(0, 60);
  const avatarChar = (title.trim()[0] || "记").toUpperCase();
  const avatarBg = AVATAR_GRADIENTS[note.noteType] || DEFAULT_GRADIENT;

  return (
    <motion.button
      layout
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-card text-left relative active:bg-group transition-colors duration-100 select-none"
    >
      {/* 类型化头像：首字圆标 + 类型渐变 */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold shrink-0 shadow-sm"
        style={{ background: avatarBg }}
        aria-hidden
      >
        {avatarChar}
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[0.9375rem] font-medium text-deep-ink truncate">
            {title}
            {note.isPinned && <Pin size={12} className="inline ml-1.5 text-emerald -mt-0.5" fill="currentColor" />}
          </h3>
          <span className="text-xs text-faded-slate shrink-0">{getRelativeTime(note.updated_at)}</span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          {/* 摘要 / 待办进度 */}
          {isTodo && todoStats.total > 0 ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex-1 h-1 bg-scribe/40 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-emerald rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: Math.round((todoStats.completed / todoStats.total) * 100) + "%" }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                />
              </div>
              <span className="text-[0.6875rem] font-mono text-faded-slate shrink-0">{todoStats.completed}/{todoStats.total}</span>
            </div>
          ) : (
            <p className="text-[0.8125rem] text-warm-steel truncate flex-1 min-w-0">
              {snippet ? renderLinks(snippet) : typeDef.label}
            </p>
          )}
          {/* 类型图标 + 提醒 */}
          <TypeIcon size={13} className="text-faded-slate shrink-0" />
          {hasReminder && <Bell size={12} className="text-faded-slate shrink-0" />}
        </div>

        {/* 右下角标签（最多 2 个 + 剩余计数） */}
        {(note.tags || []).length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 justify-end flex-wrap">
            {note.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-[0.625rem] font-medium bg-scribe/40 text-warm-steel rounded-md max-w-[80px] truncate">
                {tag}
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className="px-1 py-0.5 text-[0.625rem] font-medium text-faded-slate">+{note.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}

export { getRelativeTime };
