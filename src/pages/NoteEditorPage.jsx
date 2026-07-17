import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, X, Save, Sparkles, Trash2,
  Pin, Folder, CheckSquare, Award, StickyNote, FileText,
} from "lucide-react";
import useNoteStore from "../store/noteStore";
import useAchievementStore from "../store/achievementStore";
import useSettingsStore from "../store/settingsStore";
import { matchAchievements } from "../api/ai";
import { NOTE_TYPES, NOTE_TYPE_KEYS, BG_COLORS, DEFAULT_FOLDERS } from "../data/noteTypes";
import TodoChecklist from "../components/todo/TodoChecklist";
import MarkdownEditor from "../components/editor/MarkdownEditor";
import BackgroundSelector from "../components/editor/BackgroundSelector";
import AmbientAnimation from "../components/editor/AmbientAnimation";
import useFolderStore from "../store/folderStore";
import NoteLinks from "../components/notes/NoteLinks";
import useEditorActionsStore from "../store/editorActionsStore";

const TYPE_ICONS = {
  journal: FileText,
  todo: CheckSquare,
  milestone: Award,
  flashcard: StickyNote,
};

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
  const [noteType, setNoteType] = useState("journal");
  const [isPinned, setIsPinned] = useState(false);
  const [bgColorId, setBgColorId] = useState(0);
  const [folderId, setFolderId] = useState("inbox");
  const [useMarkdown, setUseMarkdown] = useState(false);
  const [markdownContent, setMarkdownContent] = useState("");
  const [bgPattern, setBgPattern] = useState("solid");
  const [animTheme, setAnimTheme] = useState("none");
  const folders = useFolderStore((s) => s.folders);
  const { loadFolders } = useFolderStore();
  const [saveStatus, setSaveStatus] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const noteIdRef = useRef(null);
  const [images, setImages] = useState([]);
  const fileInputRef = useRef(null);
  const latestRef = useRef({});

  // Sync ref with state
  const syncRef = () => {
    latestRef.current = { title, body, tags, noteType, isPinned, bgColorId, bgPattern, animTheme, folderId, useMarkdown, markdownContent, contentMarkdown: useMarkdown ? markdownContent : null };
  };
  syncRef();

  const isExistingNote = noteId && noteId !== "new";

  useEffect(() => {
    if (noteId && noteId !== "new") {
      setLoaded(false);
      getNoteById(noteId).then((note) => {
        if (note) {
          setTitle(note.title || "");
          setBody(note.body || "");
          setTags(note.tags || []);
          setNoteType(note.noteType || "journal");
          setIsPinned(note.isPinned || false);
          setBgColorId(note.bgColorId ?? 0);
          setFolderId(note.folderId || "inbox");
          setUseMarkdown(!!note.contentMarkdown);
          setMarkdownContent(note.contentMarkdown || "");
          setBgPattern(note.bgPattern || "solid");
          setAnimTheme(note.animTheme || "none");
          noteIdRef.current = note.id;
        }
        setLoaded(true);
      });
    } else {
      noteIdRef.current = null;
      setTitle(""); setBody(""); setTags([]); setTagInput("");
      setNoteType("journal"); setIsPinned(false); setBgColorId(0);
      setFolderId("inbox");
      setLoaded(true);
    }
  }, [noteId]);

  // Auto-save
  useEffect(() => {
    if (!loaded || (!title && !body)) return;
    const timer = setTimeout(async () => {
      await performSave(false, latestRef.current);
    }, 2000);
    return () => clearTimeout(timer);
  }, [title, body, markdownContent, loaded]);

  // 即时保存：非文本操作后立即触发
  const immediateSave = () => setTimeout(() => performSave(false, latestRef.current), 0);

  // 注册编辑器操作到 Store（供 TabBar 消费）
  useEffect(() => {
    useEditorActionsStore.getState().setEditorActions({
      onSave: () => performSave(false, latestRef.current),
      onSaveWithAI: handleManualSave,
      onPinToggle: () => { setIsPinned((p) => !p); immediateSave(); },
      onDelete: handleDelete,
      isPinned,
      isExistingNote,
      isAIAnalyzing: saveStatus === "ai-analyzing",
      bgColorId,
      onChangeBgColor: (id) => { setBgColorId(id); immediateSave(); },
      folderId,
      onChangeFolder: (id) => { setFolderId(id); immediateSave(); },
      tags,
      onAddTag: (tag) => { if (tag && !tags.includes(tag)) { setTags([...tags, tag]); setTagInput(""); immediateSave(); } },
      onRemoveTag: (tag) => { setTags(tags.filter((t) => t !== tag)); immediateSave(); },
    });
  }, [isPinned, isExistingNote, saveStatus, bgColorId, folderId, tags]);

  // 离开编辑器时保存并清除操作
  useEffect(() => {
    return () => {
      const snap = latestRef.current;
      if (snap?.title?.trim() || snap?.body?.trim() || snap?.markdownContent?.trim()) {
        performSave(false, snap).catch(() => {});
      }
      useEditorActionsStore.getState().clearActions();
    };
  }, []);

  const performSave = async (triggerAI, snap) => {
    const s = snap || latestRef.current;
    setSaveStatus(triggerAI ? "ai-analyzing" : "saving");
    try {
      const note = {
        id: noteIdRef.current || undefined,
        title: s.title.trim(),
        body: s.useMarkdown ? "" : s.body.trim(),
        contentMarkdown: s.useMarkdown ? s.markdownContent : null,
        tags: [...s.tags],
        noteType: s.noteType,
        isPinned: s.isPinned,
        bgColorId: s.bgColorId,
        bgPattern: s.bgPattern || "solid",
        animTheme: s.animTheme || "none",
        folderId: s.folderId,
        images: [],
        snippet: (s.body || "").slice(0, 120),
      };
      const saved = await saveNoteToStore(note);
      noteIdRef.current = saved.id;

      if (triggerAI && (apiKey || useSettingsStore.getState().useMode !== "online")) {
        const noteContent = s.title + "\n" + (s.useMarkdown ? s.markdownContent : s.body);
        const matchedIds = await matchAchievements(noteContent, apiKey || "", modelProvider, inference);
        for (const id of matchedIds) {
          await unlockAchievement(id, saved.id);
        }
      }
      setSaveStatus("saved");
    } catch (err) {
      console.error("Save failed:", err);
      // 显示具体错误信息以便调试
      setSaveStatus("error:" + (err?.message || "未知错误"));
    }
    setTimeout(() => {
      setSaveStatus((prev) => (prev === "saved" || prev === "error" ? "" : prev));
    }, 2000);
  };

  const handleManualSave = () => performSave(true, latestRef.current);

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
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(""); }
  };
  const removeTag = (t) => setTags(tags.filter((tag) => tag !== t));
  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  };

  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric",
  });
  const currentBgColor = BG_COLORS.find((c) => c.id === bgColorId) || BG_COLORS[0];
  const isTodo = noteType === "todo";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={"min-h-[100dvh] flex flex-col transition-colors duration-300 " + currentBgColor.class + (bgPattern !== "solid" ? " bg-pattern-" + bgPattern + (bgColorId === 6 ? " bg-pattern-dark" : "") : "")}
    >
      {/* Header */}
      <div className={"grid grid-cols-3 items-center px-4 pt-4 pb-3 border-b safe-area-top " + currentBgColor.border}>
        <button onClick={async () => {
          const snap = latestRef.current;
          if (snap.title?.trim() || snap.body?.trim() || snap.markdownContent?.trim()) {
            await performSave(false, snap);
          }
          onBack();
        }}
          className="justify-self-start w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors -ml-2">
          <ArrowLeft size={20} className="text-warm-steel" />
        </button>
        <span className="text-xs font-mono text-faded-slate text-center">{today}</span>
        <div className="flex items-center gap-2 justify-self-end">
          {saveStatus === "saving" && <span className="text-xs text-faded-slate">自动保存</span>}
          {saveStatus === "ai-analyzing" && (
            <span className="flex items-center gap-1.5 text-xs text-emerald">
              <Sparkles size={12} className="animate-breathe" />AI 分析中
            </span>
          )}
          {saveStatus && saveStatus.startsWith("error") && (
            <span className="flex items-center gap-1.5 text-xs text-rose" title={saveStatus}>
              <span className="w-1.5 h-1.5 rounded-full bg-rose" />{saveStatus === "error" ? "保存失败" : saveStatus}
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs text-emerald">
              <Save size={12} />已保存
            </span>
          )}
        </div>
      </div>

      {/* Type selector */}
      <div className="flex gap-1.5 px-4 pt-3 pb-1 overflow-x-auto scrollbar-none">
        {NOTE_TYPE_KEYS.map((key) => {
          const t = NOTE_TYPES[key];
          const isActive = noteType === key;
          const Icon = TYPE_ICONS[key];
          return (
            <button key={key} onClick={() => { setNoteType(key); immediateSave(); }}
              className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all " +
                (isActive ? t.color + " text-white shadow-sm scale-105" : "bg-white/60 text-warm-steel hover:bg-white/80 border border-scribe")}>
              <Icon size={12} />{t.label}
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col px-4 py-3 overflow-y-auto">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={isTodo ? "待办清单标题..." : "给自己的此刻..."}
          className="w-full text-[1.5rem] font-bold text-deep-ink placeholder-faded-slate bg-transparent border-none outline-none mb-3" />

        {/* 编辑模式切换 */}
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => { setUseMarkdown(false); immediateSave(); }}
            className={"px-2.5 py-1 text-xs rounded-full transition-colors " + (!useMarkdown ? "bg-emerald text-white shadow-sm" : "bg-white/60 text-faded-slate border border-scribe")}>
            纯文本
          </button>
          <button onClick={() => { setUseMarkdown(true); immediateSave(); }}
            className={"px-2.5 py-1 text-xs rounded-full transition-colors " + (useMarkdown ? "bg-emerald text-white shadow-sm" : "bg-white/60 text-faded-slate border border-scribe")}>
            Markdown
          </button>
        </div>

        {useMarkdown ? (
          <MarkdownEditor value={markdownContent} onChange={setMarkdownContent}
            minHeight={isTodo ? 60 : 200} onModeChange={immediateSave} />
        ) : (
          <textarea value={body} onChange={(e) => setBody(e.target.value)}
            placeholder={isTodo ? "添加备注（可选）..." : "记录这一刹.."}
            className={"w-full text-[0.9375rem] text-warm-steel placeholder-faded-slate bg-transparent border-none outline-none resize-none leading-relaxed " + (isTodo ? "min-h-[60px]" : "min-h-[200px] flex-1")} />
        )}

        {/* Todo checklist — shown when noteType is todo */}
        {isTodo && noteIdRef.current && (
          <TodoChecklist noteId={noteIdRef.current} onToggle={immediateSave} />
        )}
        {isTodo && !noteIdRef.current && (
          <div className="border-t border-scribe pt-3 mt-3">
            <p className="text-xs text-center text-faded-slate py-4">保存笔记后即可添加待办事项</p>
          </div>
        )}

        </div>


      {noteIdRef.current && <NoteLinks noteId={noteIdRef.current} parentId={null} onNavigate={() => {}} />}

      {/* 环境动效 */}
      <AmbientAnimation theme={animTheme} />

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft">
            <h3 className="text-lg font-bold text-deep-ink mb-2">确认删除</h3>
            <p className="text-sm text-warm-steel mb-6">此笔记将被移至回收站，可在设置中恢复。确定要继续吗？</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink hover:bg-canvas-warm">
                <X size={16} />取消
              </button>
              <button onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose text-white rounded-btn text-sm hover:bg-red-600">
                <Trash2 size={16} />确认删除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}