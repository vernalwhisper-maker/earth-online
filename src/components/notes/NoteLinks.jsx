import { useState, useEffect } from "react";
import { Link, Unlink } from "lucide-react";
import { getNote } from "../../db";

export default function NoteLinks({ noteId, parentId, onNavigate }) {
  const [parentNote, setParentNote] = useState(null);
  const [childNotes, setChildNotes] = useState([]);

  useEffect(() => {
    if (parentId) {
      getNote(parentId).then((note) => {
        if (note && !note.deletedAt) setParentNote(note);
      });
    }
    // 查找子笔记功能较为复杂，通过 noteStore 查询
    // 这里简化为只显示父笔记
  }, [noteId, parentId]);

  if (!parentNote) return null;

  return (
    <div className="border-t border-scribe pt-2 mt-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Link size={12} className="text-faded-slate" />
        <span className="text-[0.65rem] font-mono text-faded-slate">关联笔记</span>
      </div>
      <button onClick={() => onNavigate?.(parentNote.id)}
        className="flex items-center gap-2 w-full px-2.5 py-2 rounded-btn bg-emerald/5 border border-emerald/20 text-left hover:bg-emerald/10 transition-colors">
        <Link size={12} className="text-emerald shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-deep-ink truncate">{parentNote.title || "无标题"}</p>
          <p className="text-[0.65rem] text-faded-slate">父笔记</p>
        </div>
      </button>
    </div>
  );
}
