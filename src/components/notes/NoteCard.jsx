import { motion } from "framer-motion";

function getRelativeTime(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}天前`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) return `${diffWeek}周前`;
  return date.toLocaleDateString("zh-CN");
}

export default function NoteCard({ note, onClick }) {
  return (
    <motion.button
      layout
      onClick={onClick}
      className="w-full bg-surface border border-scribe rounded-card p-4 text-left hover:bg-canvas-warm transition-colors"
    >
      <h3 className="text-base font-semibold text-deep-ink line-clamp-2 mb-1">
        {note.title || "无标题"}
      </h3>
      {note.body && (
        <p className="text-sm text-warm-steel line-clamp-1 mb-3">
          {note.body}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-faded-slate">
          {getRelativeTime(note.updated_at)}
        </span>
        {(note.tags || []).length > 0 && (
          <div className="flex gap-1.5">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[0.6875rem] font-medium bg-scribe/30 text-warm-steel rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.button>
  );
}

export { getRelativeTime };
