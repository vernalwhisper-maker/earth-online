import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, X, Save, Sparkles, Trash2,
  Pin, Folder, CheckSquare, Award, StickyNote, FileText, Download, Lock, Mic, FileAudio, Square, Check,
} from "lucide-react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { exportToEonBlob, generateMarkdownFilename, exportNoteToMarkdown } from "../utils/notesFile";
import { isCapacitor, blobToBase64, saveFileToDownloads, downloadBlobInBrowser } from "../utils/exportFile";
import { createSpeechRecognizer } from "../utils/stt";
import { stripAISummaryMarkers, generateSummary } from "../utils/aiChat";
import useToastStore from "../store/toastStore";
import useNoteStore from "../store/noteStore";
import useAchievementStore from "../store/achievementStore";
import useSettingsStore from "../store/settingsStore";
import { matchAchievements } from "../api/ai";
import { storeMediaFile } from "../utils/mediaStorage";
import { NOTE_TYPES, NOTE_TYPE_KEYS, BG_COLORS, DEFAULT_FOLDERS } from "../data/noteTypes";
import TodoChecklist from "../components/todo/TodoChecklist";
import MarkdownEditor from "../components/editor/MarkdownEditor";
import BackgroundSelector from "../components/editor/BackgroundSelector";
import AmbientAnimation from "../components/editor/AmbientAnimation";
import useFolderStore from "../store/folderStore";
import ImageViewer from "../components/ui/ImageViewer";
import NoteLinks from "../components/notes/NoteLinks";
import useEditorActionsStore from "../store/editorActionsStore";
import GlassModal from "../components/ui/GlassModal";

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
  const batchUnlock = useAchievementStore((s) => s.batchUnlock);
  const { modelProvider, apiKey, inference, voiceRecognitionEnabled } = useSettingsStore();
  const cardExpandAnim = useSettingsStore((s) => s.cardExpandAnim);

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
  // 导出相关状态
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showExportPwd, setShowExportPwd] = useState(false);
  const [exportPwd, setExportPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [exporting, setExporting] = useState(false);

  const noteIdRef = useRef(null);
  const [images, setImages] = useState([]);
  const [viewerIdx, setViewerIdx] = useState(-1);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const latestRef = useRef({});
  const isUnmountedRef = useRef(false);

  // Sync ref with state
  const syncRef = () => {
    latestRef.current = { title, body, tags, noteType, isPinned, bgColorId, bgPattern, animTheme, folderId, useMarkdown, markdownContent, contentMarkdown: useMarkdown ? markdownContent : null, images };
  };
  syncRef();

  const isExistingNote = noteId && noteId !== "new";

  useEffect(() => {
    // 请求序号：异步返回时若已有更新的请求（已切换笔记/新建），丢弃旧结果
    const myReq = ++loadRequestIdRef.current;
    if (noteId && noteId !== "new") {
      setLoaded(false);
      getNoteById(noteId).then((note) => {
        if (myReq !== loadRequestIdRef.current) return; // 已切换到其他笔记
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
          setImages(note.images || []);
          noteIdRef.current = note.id;
          // 记录初始快照：未修改则退出/自动保存都不落库（不更新时间与位置）
          captureInitialSnap(note);
          isInitialLoadRef.current = true;
        }
        setLoaded(true);
      });
    } else {
      noteIdRef.current = null;
      setTitle(""); setBody(""); setTags([]); setTagInput("");
      setNoteType("journal"); setIsPinned(false); setBgColorId(0);
      setFolderId("inbox");
      // 新建笔记：不设初始快照，允许直接保存
      initialSnapRef.current = null;
      isInitialLoadRef.current = false;
      setLoaded(true);
    }
  }, [noteId]);

  // 保存队列：串行化所有 performSave，保证写入顺序与触发顺序一致，
  // 避免并发 db.put 覆盖导致旧快照覆盖新内容（丢字）
  const saveQueueRef = useRef(Promise.resolve());
  // 初次加载标记：加载已有笔记后首次 autosave effect 运行仅同步初始值，不触发保存
  const isInitialLoadRef = useRef(false);
  // 加载时的初始快照：用于判断用户是否真正修改过（无修改则不保存，避免时间/位置变动）
  const initialSnapRef = useRef(null);
  // 笔记加载请求序号（防旧回调污染新笔记）
  const loadRequestIdRef = useRef(0);

  const captureInitialSnap = (s) => {
    initialSnapRef.current = {
      title: s.title || "",
      body: s.body || "",
      // 笔记对象字段为 contentMarkdown（编辑器 state 为 markdownContent）
      markdownContent: s.contentMarkdown || s.markdownContent || "",
      tags: s.tags || [],
      noteType: s.noteType || "journal",
      isPinned: s.isPinned || false,
      bgColorId: s.bgColorId ?? 0,
      folderId: s.folderId || "inbox",
      // 图片按 uri 列表比较（数量相同但内容不同也要视为修改）
      imagesKey: (s.images || []).map((i) => i.uri || i.name || "").join("|"),
    };
  };

  const hasChangesSinceLoad = () => {
    const init = initialSnapRef.current;
    const s = latestRef.current;
    if (!init || !s) return true;
    const imagesKey = (s.images || []).map((i) => i.uri || i.name || "").join("|");
    return !(
      init.title === s.title
      && init.body === s.body
      && init.markdownContent === s.markdownContent
      && JSON.stringify(init.tags) === JSON.stringify(s.tags || [])
      && init.noteType === s.noteType
      && init.isPinned === s.isPinned
      && init.bgColorId === s.bgColorId
      && init.folderId === s.folderId
      && init.imagesKey === imagesKey
    );
  };

  useEffect(() => {
    if (!loaded || (!title && !body && !markdownContent)) return;
    // 加载已有笔记后的首次 effect 运行：仅同步初始值，不触发自动保存
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
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
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      const snap = latestRef.current;
      const hasContent = snap?.title?.trim() || snap?.body?.trim() || snap?.markdownContent?.trim();
      // 已有笔记且无任何修改 → 不保存（避免 updated_at 变化导致时间/位置变动）
      if (hasContent && hasChangesSinceLoad()) {
        performSave(false, snap).catch(() => {});
      }
      useEditorActionsStore.getState().clearActions();
    };
  }, []);

  const performSave = async (triggerAI, snap) => {
    const s = snap || latestRef.current;
    setSaveStatus(triggerAI ? "ai-analyzing" : "saving");

    const run = async () => {
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
        images: s.images || [],
        snippet: (s.body || "").slice(0, 120),
      };
      const saved = await saveNoteToStore(note);
      noteIdRef.current = saved.id;

      if (triggerAI && (apiKey || useSettingsStore.getState().useMode !== "online")) {
        const noteContent = s.title + "\n" + (s.useMarkdown ? s.markdownContent : s.body);
        const matchedIds = await matchAchievements(noteContent, apiKey || "", modelProvider, inference);
        if (matchedIds.length > 0) {
          batchUnlock(matchedIds, saved.id);
        }
      }
      setSaveStatus("saved");
    };

    // 入队：前一个保存完成后才执行本次（失败不阻断队列）
    const next = saveQueueRef.current.then(run, run);
    saveQueueRef.current = next.catch(() => {});
    try {
      await next;
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("error:" + (err?.message || "未知错误"));
    }
    setTimeout(() => {
      setSaveStatus((prev) => (prev === "saved" || prev.startsWith("error") ? "" : prev));
    }, 2000);
  };

  const handleManualSave = () => performSave(true, latestRef.current);

  const addToast = useToastStore((s) => s.addToast);

  // 单篇笔记导出
  const doSingleExport = async (format) => {
    const note = latestRef.current;
    if (!note.title?.trim() && !note.body?.trim() && !note.markdownContent?.trim()) {
      addToast?.("笔记内容为空，无法导出", "error");
      return;
    }
    setShowExportMenu(false);

    if (format === "md") {
      setExporting(true);
      try {
        const fullNote = {
          title: note.title,
          body: note.body,
          contentMarkdown: note.markdownContent || null,
        };
        const md = exportNoteToMarkdown(fullNote);
        const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
        const filename = generateMarkdownFilename(fullNote);
        const res = await saveBlobToFile(blob, filename);
        if (res?.ok) {
          addToast?.(res.message || "导出成功", "success");
        } else {
          addToast?.(res?.message || "导出失败", "error");
        }
      } catch (err) {
        addToast?.(err.message || "导出失败", "error");
      }
      setExporting(false);
    } else if (format === "eon") {
      setExportPwd("");
      setPwdError("");
      setShowExportPwd(true);
    }
  };

  // 通用文件保存：Android 原生写系统 Download（MediaStore，免 SAF）→ 兜底 Filesystem → 浏览器下载
  // 返回 { ok, where, message }，供调用方给出准确提示
  const saveBlobToFile = async (blob, filename) => {
    try {
      if (isCapacitor()) {
        const base64 = await blobToBase64(blob);
        // 原生 MediaStore 写入系统 Download/EarthOnline/
        const saved = await saveFileToDownloads(base64, filename);
        if (saved) return { ok: true, where: "download", message: `已保存到 下载/EarthOnline/${filename}` };
        // 兜底：Filesystem Documents/Cache
        try {
          await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Documents });
          return { ok: true, where: "documents", message: `已保存到 Documents/${filename}` };
        } catch {
          await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
          return { ok: true, where: "cache", message: `已保存到应用缓存/${filename}` };
        }
      }
      // Web：浏览器下载
      const started = downloadBlobInBrowser(blob, filename);
      return started
        ? { ok: true, where: "web", message: `已开始下载：${filename}` }
        : { ok: false, message: "浏览器阻止了下载，请允许下载后重试" };
    } catch (err) {
      return { ok: false, message: err?.message || "导出失败，请重试" };
    }
  };

  // eon 格式加密导出
  const doEonExport = async () => {
    const pw = exportPwd.trim();
    if (!pw || pw.length < 4) { setPwdError("密码至少4位"); return; }
    setShowExportPwd(false);
    setExporting(true);
    try {
      const note = latestRef.current;
      const noteObj = {
        id: noteIdRef.current || undefined,
        title: note.title,
        body: note.useMarkdown ? "" : note.body,
        contentMarkdown: note.useMarkdown ? note.markdownContent : null,
        tags: [...note.tags],
        noteType: note.noteType,
        isPinned: note.isPinned,
        bgColorId: note.bgColorId,
        bgPattern: note.bgPattern || "solid",
        animTheme: note.animTheme || "none",
        folderId: note.folderId,
        snippet: (note.body || "").slice(0, 120),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const blob = await exportToEonBlob([noteObj], pw);
      const now = new Date();
      const y = now.getFullYear();
      const M = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const filename = `${y}${M}${d}_${h}${m}_单篇笔记.eon`;
      const res = await saveBlobToFile(blob, filename);
      if (res?.ok) {
        addToast?.(res.message || "导出成功", "success");
      } else {
        addToast?.(res?.message || "导出失败", "error");
      }
    } catch (err) {
      addToast?.(err.message || "导出失败", "error");
    }
    setExporting(false);
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

  // 图片导入 — 三环境适配
  const handleImageImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.startsWith("image/")) { addToast?.("请选择图片文件", "error"); return; }
    if (file.size > 20 * 1024 * 1024) { addToast?.("图片过大，请选择 20MB 以内的文件", "error"); return; }
    try {
      const { uri, markdown, isImage } = await storeMediaFile(file);
      // 两种模式都加入图片预览区
      setImages((prev) => [...prev, { uri, name: file.name }]);
      if (useMarkdown) {
        setMarkdownContent((prev) => prev + "\n" + markdown + "\n");
      } else {
        setBody((prev) => prev + `\n[图片: ${file.name}]\n`);
      }
    } catch (err) {
      addToast?.(err.message || "图片导入失败", "error");
    }
  };

  // 音频导入 — 三环境适配
  const handleAudioImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 20 * 1024 * 1024) { addToast?.("音频过大，请选择 20MB 以内的文件", "error"); return; }
    try {
      const { html } = await storeMediaFile(file);
      if (useMarkdown) {
        setMarkdownContent((prev) => prev + "\n" + html + "\n");
      } else {
        setBody((prev) => prev + "\n" + html + "\n");
      }
    } catch (err) {
      addToast?.(err.message || "音频导入失败", "error");
    }
  };

  // 语音听写
  const [isListening, setIsListening] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const recognizerRef = useRef(null);
  // 语音听写弹窗
  const [showSpeechModal, setShowSpeechModal] = useState(false);
  const [speechText, setSpeechText] = useState("");
  // AI 总结弹窗
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryResult, setSummaryResult] = useState("");
  // 记录本次 AI 总结插入的内容，供「取消」回滚
  const summaryInsertedRef = useRef(null); // { text, isMarkdown }

  const stopListening = () => {
    recognizerRef.current?.stop?.();
    setIsListening(false);
    setShowSpeechModal(false);
  };

  // ── 系统返回键：编辑器内弹窗打开时优先关闭弹窗（App.jsx backButton 检测 window.__editorModalOpen）──
  const editorModalOpen = showDeleteConfirm || showExportMenu || showExportPwd || showSpeechModal || showSummaryModal;
  const handleBackCloseModal = () => {
    if (showExportMenu) setShowExportMenu(false);
    else if (showExportPwd) setShowExportPwd(false);
    else if (showDeleteConfirm) setShowDeleteConfirm(false);
    else if (showSpeechModal) setShowSpeechModal(false);
    else if (showSummaryModal) setShowSummaryModal(false);
  };
  useEffect(() => {
    window.__editorModalOpen = editorModalOpen;
    window.__closeEditorModal = editorModalOpen ? handleBackCloseModal : null;
    return () => {
      window.__editorModalOpen = false;
      window.__closeEditorModal = null;
    };
  }, [editorModalOpen]);

  // 组件卸载时中止语音识别，避免麦克风持续占用与对已卸载组件 setState
  useEffect(() => {
    return () => {
      recognizerRef.current?.abort?.();
    };
  }, []);

  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopListening();
      addToast?.("语音听写已停止", "info");
      return;
    }
    const recognizer = createSpeechRecognizer({
      language: "zh-CN",
      onResult: ({ final }) => {
        if (final) {
          setSpeechText((prev) => prev + final);
          if (useMarkdown) {
            setMarkdownContent((prev) => prev + final);
          } else {
            setBody((prev) => prev + final);
          }
        }
      },
      onError: (err) => {
        addToast?.(err, "error");
        setIsListening(false);
        setShowSpeechModal(false);
      },
    });
    if (!recognizer.isSupported) {
      addToast?.("浏览器不支持语音识别，请使用 Chrome", "error");
      return;
    }
    recognizerRef.current = recognizer;
    setSpeechText("");
    setShowSpeechModal(true);
    recognizer.start();
    setIsListening(true);
  };

  // AI 总结（支持当前 useMode：WebLLM 本地模型 / Ollama / 云端 API）
  const handleSummarize = async () => {
    // 过滤掉笔记中已有的 AI 总结标记（避免重复/空标记影响）
    const rawContent = useMarkdown ? markdownContent : body;
    const content = stripAISummaryMarkers(rawContent || "");
    if (!content?.trim()) {
      addToast?.("笔记内容为空，无法总结", "error");
      return;
    }
    // 云端模式需要 API Key；本地模式（webllm/ollama）不需要
    const { apiKey, modelProvider, inference, useMode } = useSettingsStore.getState();
    if (useMode !== "webllm" && useMode !== "ollama" && !apiKey) {
      addToast?.("请先在设置中配置 API Key", "error");
      return;
    }
    setShowSummaryModal(true);
    setSummaryResult("");
    setSummarizing(true);
    try {
      const summary = await generateSummary(content, apiKey, modelProvider, inference);
      // 总结为空/失败：不插入空标记
      if (!summary || !summary.trim()) {
        addToast?.("AI 总结失败，请稍后重试", "error");
        setShowSummaryModal(false);
        setSummarizing(false);
        return;
      }
      const summaryText = "\n\n> **AI 总结**：" + summary;
      if (useMarkdown) {
        setMarkdownContent((prev) => prev + summaryText);
      } else {
        setBody((prev) => prev + summaryText);
      }
      // 记录插入内容，供「取消（不应用）」回滚
      summaryInsertedRef.current = { text: summaryText, isMarkdown: useMarkdown };
      setSummaryResult(summary);
    } catch (err) {
      addToast?.(err.message || "总结失败", "error");
      setShowSummaryModal(false);
    }
    setSummarizing(false);
  };

  // 取消本次 AI 总结：回滚已插入的文本
  const handleCancelSummary = () => {
    const inserted = summaryInsertedRef.current;
    if (inserted) {
      if (inserted.isMarkdown) {
        setMarkdownContent((prev) => (prev.endsWith(inserted.text) ? prev.slice(0, -inserted.text.length) : prev));
      } else {
        setBody((prev) => (prev.endsWith(inserted.text) ? prev.slice(0, -inserted.text.length) : prev));
      }
    }
    summaryInsertedRef.current = null;
    setShowSummaryModal(false);
    // 若 2s 自动保存已把总结写入库中，回滚后立即保存一次使库与界面一致
    immediateSave();
  };

  // 确定应用本次 AI 总结
  const handleApplySummary = () => {
    summaryInsertedRef.current = null;
    setShowSummaryModal(false);
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
      initial={{ opacity: 0, x: cardExpandAnim ? 0 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: cardExpandAnim ? 0 : -20 }}
      className={"min-h-[100dvh] flex flex-col transition-colors duration-300 " + currentBgColor.class + (bgPattern !== "solid" ? " bg-pattern-" + bgPattern + (bgColorId === 6 ? " bg-pattern-dark" : "") : "")}
    >
      {/* Header */}
      <div className={"grid grid-cols-3 items-center px-4 pt-4 pb-3 border-b safe-area-top " + currentBgColor.border}>
        <div className="flex items-center gap-0.5 justify-self-start -ml-2">
          <button onClick={async () => {
            const snap = latestRef.current;
            const hasContent = snap.title?.trim() || snap.body?.trim() || snap.markdownContent?.trim();
            // 无修改（含从未保存过的新笔记内容为空）直接返回，不触发保存
            if (hasContent && hasChangesSinceLoad()) {
              await performSave(false, snap);
            }
            onBack();
          }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} className="text-warm-steel" />
          </button>
          {/* 语音听写（开关关闭时不显示图标） */}
          {voiceRecognitionEnabled && (
            <button onClick={toggleSpeechRecognition}
              className={"w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors " + (isListening ? "text-emerald" : "")}
              title={isListening ? "停止听写" : "语音听写"}>
              <Mic size={16} className={isListening ? "text-emerald" : "text-warm-steel"} />
            </button>
          )}
          <button onClick={handleSummarize} disabled={summarizing}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title={summarizing ? "正在总结..." : "AI 总结"}>
            <FileAudio size={16} className="text-warm-steel" />
          </button>
        </div>
        <span className="text-xs font-mono text-faded-slate text-center">{today}</span>
        <div className="flex items-center gap-2 justify-self-end">
          <button onClick={() => setShowExportMenu(true)} disabled={exporting}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="导出笔记">
            <Download size={16} className="text-warm-steel" />
          </button>
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
                (isActive ? t.color + " text-white shadow-sm scale-105" : "bg-group text-warm-steel hover:bg-group border border-scribe")}>
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

        {/* 编辑模式切换 — 集成工具栏 */}
        <div className="flex items-center gap-1.5 mb-2">
          <button onClick={() => { setUseMarkdown(false); immediateSave(); }}
            className={"px-2 py-1 text-[11px] rounded-full transition-colors " + (!useMarkdown ? "bg-emerald/10 text-emerald font-medium" : "text-faded-slate hover:text-warm-steel")}>
            纯文本
          </button>
          <button onClick={() => { setUseMarkdown(true); immediateSave(); }}
            className={"px-2 py-1 text-[11px] rounded-full transition-colors " + (useMarkdown ? "bg-emerald/10 text-emerald font-medium" : "text-faded-slate hover:text-warm-steel")}>
            Markdown
          </button>
          <span className="w-px h-4 bg-scribe mx-1" />
          <button onClick={() => imageInputRef.current?.click()}
            className="px-2 py-1 text-[11px] text-faded-slate hover:text-warm-steel rounded-full hover:bg-group transition-colors"
            title="插入图片">
            🖼️
          </button>
          <button onClick={() => audioInputRef.current?.click()}
            className="px-2 py-1 text-[11px] text-faded-slate hover:text-warm-steel rounded-full hover:bg-group transition-colors"
            title="插入音频">
            🎵
          </button>
        </div>
        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageImport} className="hidden" />
        <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioImport} className="hidden" />

        {/* 图片预览区 — 两种模式共用 */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <img src={img.uri} alt={img.name}
                  onClick={() => setViewerIdx(i)}
                  className="max-w-[200px] max-h-[150px] rounded-xl object-cover border border-scribe cursor-pointer hover:ring-2 hover:ring-emerald/50 transition-all" />
                <button onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={12} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {useMarkdown ? (
          <MarkdownEditor value={markdownContent} onChange={setMarkdownContent}
            minHeight={isTodo ? 60 : 200} onModeChange={immediateSave} />
        ) : (
          <textarea value={body} onChange={(e) => setBody(e.target.value)}
            placeholder={isTodo ? "添加备注（可选）..." : "记录这一刹.."}
            className={"w-full text-[0.9375rem] text-warm-steel placeholder-faded-slate bg-transparent border-none outline-none resize-none leading-relaxed " + (isTodo ? "min-h-[60px]" : "min-h-[200px] flex-1")} />
        )}
        {/* Todo checklist */}
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

      {/* 导出格式选择弹窗 */}
      <GlassModal show={showExportMenu} onClose={() => setShowExportMenu(false)}>
        <h3 className="text-lg font-bold text-deep-ink mb-2">导出笔记</h3>
        <p className="text-sm text-warm-steel mb-4">选择导出格式</p>
        <div className="space-y-2">
          <button onClick={() => doSingleExport("md")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-btn hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-white/20">
            <div className="text-left">
              <span className="text-sm font-medium text-deep-ink">M 格式（.md）</span>
              <p className="text-[11px] text-warm-steel mt-0.5">纯文本 Markdown 格式，无需密码</p>
            </div>
            <span className="text-xs text-faded-slate font-mono">Markdown</span>
          </button>
          <button onClick={() => doSingleExport("eon")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-btn hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-white/20">
            <div className="text-left">
              <span className="text-sm font-medium text-deep-ink">eon 格式（.eon）</span>
              <p className="text-[11px] text-warm-steel mt-0.5">加密格式，需要设置密码</p>
            </div>
            <span className="text-xs text-faded-slate font-mono">加密</span>
          </button>
        </div>
        <button onClick={() => setShowExportMenu(false)}
          className="w-full mt-4 py-2.5 border border-white/20 rounded-btn text-sm text-deep-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <X size={16} className="inline mr-1" />取消
        </button>
      </GlassModal>

      {/* eon 导出密码输入弹窗 */}
      <GlassModal show={showExportPwd} onClose={() => setShowExportPwd(false)}>
        <h3 className="text-lg font-bold text-deep-ink mb-2">设置导出密码</h3>
        <p className="text-sm text-warm-steel mb-4">输入密码加密笔记文件（eon 格式）</p>
        <input type="password" value={exportPwd} onChange={(e) => { setExportPwd(e.target.value); setPwdError(""); }}
          placeholder="输入导出密码（至少4位）" autoFocus
          className="w-full px-3 py-2.5 border border-white/20 rounded-input bg-white/10 text-deep-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald font-mono mb-2" />
        {pwdError && <p className="text-xs text-rose mb-3">{pwdError}</p>}
        <div className="flex gap-3">
          <button onClick={() => setShowExportPwd(false)}
            className="flex-1 py-2.5 border border-white/20 rounded-btn text-sm text-deep-ink hover:bg-black/5 dark:hover:bg-white/5">
            <X size={16} className="inline mr-1" />取消
          </button>
          <button onClick={doEonExport}
            className="flex-1 py-2.5 bg-emerald text-white rounded-btn text-sm">
            <Lock size={16} className="inline mr-1" />加密导出
          </button>
        </div>
      </GlassModal>

      {/* Delete confirmation */}
      <GlassModal show={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <h3 className="text-lg font-bold text-deep-ink mb-2">确认删除</h3>
        <p className="text-sm text-warm-steel mb-6">此笔记将被移至回收站，可在设置中恢复。确定要继续吗？</p>
        <div className="flex gap-3">
          <button onClick={() => setShowDeleteConfirm(false)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-white/20 rounded-btn text-sm text-deep-ink hover:bg-black/5 dark:hover:bg-white/5">
            <X size={16} />取消
          </button>
          <button onClick={handleDelete}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose text-white rounded-btn text-sm hover:bg-red-600">
            <Trash2 size={16} />确认删除
          </button>
        </div>
      </GlassModal>

      {/* 语音听写弹窗 — 统一 GlassModal 底部模式 */}
      <GlassModal show={showSpeechModal} onClose={stopListening} variant="bottom"
        className="w-[88%] max-w-xs" contentClassName="px-5 pt-1 pb-5">
        {/* 麦克风 + 状态 */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative shrink-0">
            <motion.div
              className="absolute inset-0 rounded-full bg-emerald/30"
              animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }} />
            <div className="relative w-11 h-11 rounded-full bg-emerald flex items-center justify-center">
              <Mic size={20} className="text-white" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-deep-ink">正在聆听…</p>
            <p className="text-xs text-warm-steel truncate mt-0.5">{speechText || "识别结果将显示在这里"}</p>
          </div>
        </div>
        {/* 实时识别文本（可滚动） */}
        <div className="max-h-28 overflow-y-auto rounded-xl bg-black/5 dark:bg-white/5 p-2.5 mb-3 min-h-[52px]">
          {speechText ? (
            <p className="text-xs text-deep-ink leading-relaxed whitespace-pre-wrap">{speechText}</p>
          ) : (
            <p className="text-xs text-faded-slate">正在等待语音输入…</p>
          )}
        </div>
        <button onClick={stopListening}
          className="w-full py-2.5 rounded-full bg-rose text-white text-sm font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
          <Square size={12} fill="currentColor" />停止听写
        </button>
      </GlassModal>

      {/* AI 总结弹窗 — 统一 GlassModal 底部模式 */}
      <GlassModal show={showSummaryModal}
        onClose={() => { if (!summarizing) setShowSummaryModal(false); }}
        variant="bottom" className="w-[88%] max-w-xs" contentClassName="px-5 pt-1 pb-5">
        {summarizing ? (
          <div className="py-6 flex flex-col items-center">
            <div className="relative w-10 h-10 mb-3">
              <motion.div className="absolute inset-0 rounded-full border-2 border-emerald/20" />
              <motion.div className="absolute inset-0 rounded-full border-2 border-emerald border-t-transparent"
                animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
              <Sparkles size={17} className="absolute inset-0 m-auto text-emerald" />
            </div>
            <p className="text-sm font-medium text-deep-ink">AI 正在总结…</p>
            <p className="text-xs text-warm-steel mt-1">正在分析笔记内容</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-emerald/10 flex items-center justify-center shrink-0">
                <Sparkles size={13} className="text-emerald" />
              </div>
              <h3 className="text-sm font-bold text-deep-ink">AI 总结</h3>
            </div>
            <p className="text-[0.8125rem] text-deep-ink leading-relaxed mb-4 whitespace-pre-wrap max-h-40 overflow-y-auto">{summaryResult}</p>
            <div className="flex gap-2">
              <button onClick={handleCancelSummary}
                className="flex-1 py-2.5 rounded-full border border-scribe text-sm text-deep-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <X size={14} className="inline mr-1 -mt-0.5" />取消
              </button>
              <button onClick={handleApplySummary}
                className="flex-[1.4] py-2.5 rounded-full bg-emerald text-white text-sm hover:opacity-90 transition-opacity">
                <Check size={14} className="inline mr-1 -mt-0.5" />确定
              </button>
            </div>
          </div>
        )}
      </GlassModal>

      {viewerIdx >= 0 && (
        <ImageViewer images={images} current={viewerIdx}
          onClose={(next) => setViewerIdx(next >= 0 ? next : -1)} />
      )}
    </motion.div>
  );
}