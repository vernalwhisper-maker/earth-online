import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, X, Save, Sparkles, Trash2 } from "lucide-react";
import useNoteStore from "../store/noteStore";
import useAchievementStore from "../store/achievementStore";
import useSettingsStore from "../store/settingsStore";
import { matchAchievements } from "../api/ai";

export default function NoteEditorPage({ noteId, onBack }) {
  const getNoteById = useNoteStore((s) => s.getNoteById);
  const saveNoteToStore = useNoteStore((s) => s.saveNote);
  const deleteNoteFromStore = useNoteStore((s) => s.deleteNote);
  const unlockAchievement = useAchievementStore((s) => s.unlockAchievement);
  const { modelProvider, apiKey, inference } = useSettingsStore();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [saveStatus, setSaveStatus] = useState(""); // "" | "saving" | "saved" | "ai-analyzing"
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const autoSaveTimer = useRef(null);
  const noteIdRef = useRef(null);
  const latestRef = useRef({ title: "", body: "", tags: [] });

  // Keep latestRef in sync
  latestRef.current = { title, body, tags };

  const isExistingNote = noteId && noteId !== "new";

  useEffect(() => {
    if (noteId && noteId !== "new") {
      getNoteById(noteId).then((note) => {
        if (note) {
          setTitle(note.title || "");
          setBody(note.body || "");
          setTags(note.tags || []);
          noteIdRef.current = note.id;
        }
      });
    } else {
      // Entering "new" mode: reset ref + form to avoid stale-ref overwrite
      noteIdRef.current = null;
      setTitle("");
      setBody("");
      setTags([]);
      setTagInput("");
    }
  }, [noteId]);

  // Auto-save after 2s of no input (no AI trigger)
  // Uses latestRef to avoid stale closure issues
  useEffect(() => {
    if (!title && !body) return;
    const timer = setTimeout(async () => {
      const { title: t, body: b, tags: tg } = latestRef.current;
      await performSave(false, t, b, tg);
    }, 2000);
    return () => clearTimeout(timer);
  }, [title, body, tags]);

  const performSave = async (triggerAI, saveTitle, saveBody, saveTags) => {
    // Use provided values or fall back to state
    const st = saveTitle ?? title;
    const sb = saveBody ?? body;
    const stags = saveTags ?? tags;

    setSaveStatus(triggerAI ? "ai-analyzing" : "saving");
    try {
      const note = {
        id: noteIdRef.current || undefined,
        title: st.trim(),
        body: sb.trim(),
        tags: [...stags],
      };
      const saved = await saveNoteToStore(note);
      noteIdRef.current = saved.id;

      if (triggerAI && apiKey) {
        const noteContent = `${st}\n${sb}`;
        const matchedIds = await matchAchievements(noteContent, apiKey, modelProvider, inference);
        for (const id of matchedIds) {
          await unlockAchievement(id, saved.id);
        }
      }
      setSaveStatus("saved");
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("error");
    }

    setTimeout(() => {
      setSaveStatus((prev) => (prev === "saved" || prev === "error" ? "" : prev));
    }, 2000);
  };

  const handleManualSave = () => {
    performSave(true, title, body, tags);
  };

  const handleDelete = async () => {
    const id = noteIdRef.current;
    if (!id) return;
    try {
      await deleteNoteFromStore(id);
      onBack();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const removeTag = (t) => {
    setTags(tags.filter((tag) => tag !== t));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-[100dvh] flex flex-col bg-surface"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-scribe">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-canvas-warm transition-colors -ml-2"
        >
          <ArrowLeft size={20} className="text-warm-steel" />
        </button>
        <span className="text-xs font-mono text-faded-slate">{today}</span>
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <span className="text-xs text-faded-slate">自动保存</span>
          )}
          {saveStatus === "ai-analyzing" && (
            <span className="flex items-center gap-1.5 text-xs text-emerald">
              <Sparkles size={12} className="animate-breathe" />
              AI 分析中            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1.5 text-xs text-rose">
              <span className="w-1.5 h-1.5 rounded-full bg-rose" />
              保存失败
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs text-emerald">
              <Save size={12} />
              已保存            </span>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col px-4 py-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="给自己的此刻..."
          className="w-full text-[1.5rem] font-bold text-deep-ink placeholder-faded-slate bg-transparent border-none outline-none mb-3"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="记录这一刹.."
          className="flex-1 w-full text-[0.9375rem] text-warm-steel placeholder-faded-slate bg-transparent border-none outline-none resize-none leading-relaxed min-h-[200px]"
        />

        {/* Tags */}
        <div className="mt-auto pt-4 border-t border-scribe">
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-scribe/30 text-warm-steel rounded-full"
              >
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-deep-ink">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="添加标签..."
              className="flex-1 px-3 py-1.5 text-sm border border-scribe rounded-input bg-transparent text-deep-ink placeholder-faded-slate outline-none focus:ring-2 focus:ring-emerald"
            />
            <button
              onClick={addTag}
              className="w-9 h-9 flex items-center justify-center rounded-btn border border-scribe text-warm-steel hover:bg-canvas-warm transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Save button with AI trigger */}
      <div className="px-4 py-3 border-t border-scribe">
        <div className="flex gap-2 mb-2">
          <button
            onClick={handleManualSave}
            disabled={saveStatus === "ai-analyzing"}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald text-white rounded-btn text-sm font-medium hover:bg-emerald-dark transition-colors active:scale-[0.97] disabled:opacity-50"
          >
            <Sparkles size={16} />
            {saveStatus === "ai-analyzing" ? "AI 分析中.." : "保存"}
          </button>
          {isExistingNote && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-3 border border-rose/30 text-rose rounded-btn text-sm hover:bg-rose/5 transition-colors active:scale-[0.97]"
              title="删除笔记"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
        <p className="text-center text-xs text-faded-slate mt-2">
          笔记自动保存，点击上方按钮触发成就匹配
        </p>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft"
          >
            <h3 className="text-lg font-bold text-deep-ink mb-2">确认删除</h3>
            <p className="text-sm text-warm-steel mb-6">
              此笔记将被永久删除，不可恢复。确定要继续吗？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink hover:bg-canvas-warm"
              >
                <X size={16} />
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose text-white rounded-btn text-sm hover:bg-red-600"
              >
                <Trash2 size={16} />
                确认删除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}