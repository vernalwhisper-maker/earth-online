import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Download, Upload, Trash2, RotateCcw, X, Lock, KeyRound,
  Archive, RefreshCw, FileText,
} from "lucide-react";
import useSettingsStore from "../store/settingsStore";
import useNoteStore from "../store/noteStore";
import { getAllNotes, importAllNotes, clearAllData, getDeletedNotes, restoreNote, permanentDeleteNote } from "../db";
import { exportToEonBlob, generateFilename, parseEonFile } from "../utils/notesFile";
import { Filesystem, Directory } from "@capacitor/filesystem";
import RangeSlider from "../components/ui/RangeSlider";
import useFolderStore from "../store/folderStore";
import { DEFAULT_FOLDERS } from "../data/noteTypes";
import { Bell, BellOff } from "lucide-react";
import { checkNotificationPermission, requestNotificationPermission } from "../utils/notifications";

export default function SettingsPage() {
  const {
    modelProvider, apiKey, inference, tabBarOpacity, loaded,
    setModelProvider, setApiKey, setInferenceParam, resetInference, setTabBarOpacity,
  } = useSettingsStore();
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const [showConfirm, setShowConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showExportPwd, setShowExportPwd] = useState(false);
  const [showImportPwd, setShowImportPwd] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState("");
  // Recycle bin state
  const [deletedNotes, setDeletedNotes] = useState([]);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [loadingRecycle, setLoadingRecycle] = useState(false);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderLabel, setEditingFolderLabel] = useState("");
  const [notifStatus, setNotifStatus] = useState({ native: false, web: false, anyEnabled: false });
  const fileInputRef = useRef(null);

  useEffect(() => {
    checkNotificationPermission().then(setNotifStatus);
  }, []);
  const pendingFileRef = useRef(null);

  // Load deleted notes when recycle bin opens
  useEffect(() => {
    if (showRecycleBin) {
      setLoadingRecycle(true);
      getDeletedNotes().then((notes) => {
        setDeletedNotes(notes);
        setLoadingRecycle(false);
      });
    }
  }, [showRecycleBin]);

  const { folders, addFolder, renameFolder, removeFolder } = useFolderStore();

  useEffect(() => {
    if (showFolderManager) {
      useFolderStore.getState().loadFolders();
    }
  }, [showFolderManager]);

  const doExport = async (password) => {
    setExporting(true);
    setImportResult(null);
    try {
      const notes = await getAllNotes();
      const blob = await exportToEonBlob(notes, password);
      const filename = generateFilename();
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result.split(",")[1];
          await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Documents });
          setImportResult({ success: true, count: notes.length, message: "已保存到 Documents/" + filename });
        };
        reader.readAsDataURL(blob);
      } catch (_e) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setImportResult({ success: true, count: notes.length });
      }
    } catch (err) {
      setImportResult({ success: false, message: err.message });
    }
    setExporting(false);
  };

  const doImport = async (password) => {
    const file = pendingFileRef.current;
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const notes = await parseEonFile(file, password);
      const count = await importAllNotes(notes);
      await loadNotes();
      setImportResult({ success: true, count });
    } catch (err) {
      setImportResult({ success: false, message: err.message });
    }
    setImporting(false);
  };

  const handleExportClick = () => {
    setPwdInput(""); setPwdError(""); setShowExportPwd(true);
  };
  const handleExportConfirm = () => {
    const pw = pwdInput.trim();
    if (!pw || pw.length < 4) { setPwdError("密码至少4位"); return; }
    setShowExportPwd(false); doExport(pw);
  };
  const handleImportClick = () => { fileInputRef.current?.click(); };
  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingFileRef.current = file;
    setPwdInput(""); setPwdError(""); setShowImportPwd(true);
    e.target.value = "";
  };
  const handleImportConfirm = () => {
    const pw = pwdInput.trim();
    if (!pw) { setPwdError("请输入密码"); return; }
    setShowImportPwd(false); doImport(pw);
  };

  const handleRestore = async (id) => {
    await restoreNote(id);
    await loadNotes();
    setDeletedNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handlePermanentDelete = async (id) => {
    await permanentDeleteNote(id);
    setDeletedNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearData = async () => {
    await clearAllData();
    localStorage.removeItem("earth-online-achievements");
    window.location.reload();
  };

  if (!loaded) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="px-4 pt-4 pb-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-emerald/30 border-t-emerald rounded-full animate-spin mb-4" />
        <p className="text-sm text-warm-steel">加载设置中...</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="px-4 pt-4 pb-6 max-w-2xl mx-auto">
      <h1 className="text-[1.5rem] font-bold text-deep-ink mb-6">设置</h1>

      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">AI 模型设置</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-deep-ink mb-1.5">模型选择</label>
            <select value={modelProvider} onChange={(e) => setModelProvider(e.target.value)}
              className="w-full px-3 py-2.5 border border-scribe rounded-input bg-surface text-deep-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald appearance-none">
              <option value="deepseek">DeepSeek V4 Flash</option>
              <option value="zhipu">智谱 GLM-4V-Flash</option>
              <option value="qwen">通义千问 Qwen-VL-Plus</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-deep-ink mb-1.5">API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入 API Key..."
              className="w-full px-3 py-2.5 border border-scribe rounded-input bg-surface text-deep-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald font-mono" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={"w-2 h-2 rounded-full " + (apiKey ? "bg-emerald" : "bg-warm-steel")} />
            <span className="text-warm-steel">{apiKey ? "已配置" : "未配置"}</span>
          </div>
        </div>
      </section>

      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate">推理参数</h2>
          <button onClick={resetInference} className="flex items-center gap-1 text-xs text-faded-slate hover:text-warm-steel transition-colors">
            <RotateCcw size={12} /> 重置
          </button>
        </div>
        <div className="space-y-5">
          <RangeSlider label="温度 (Temperature)" value={inference.temperature}
            onChange={(v) => setInferenceParam("temperature", v)} min={0} max={2} step={0.05}
            labels={["精确", "平衡", "创意", "发散"]} formatValue={(v) => v.toFixed(2)} />
          <RangeSlider label="最大 Token (Max Tokens)" value={inference.maxTokens}
            onChange={(v) => setInferenceParam("maxTokens", v)} min={50} max={200} step={10}
            labels={["50", "100", "150", "200"]} formatValue={(v) => v.toString()} />
          <RangeSlider label="Top-P (核采样)" value={inference.topP}
            onChange={(v) => setInferenceParam("topP", v)} min={0} max={1} step={0.05}
            labels={["严格", "适中", "灵活", "多样"]} formatValue={(v) => v.toFixed(2)} />
        </div>
      </section>

      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">数据管理</h2>
        <div className="space-y-3">
          <button onClick={handleExportClick} disabled={exporting}
            className="w-full flex items-center justify-between px-3 py-3 rounded-btn hover:bg-canvas-warm transition-colors">
            <span className="text-sm text-deep-ink">{exporting ? "正在导出..." : "导出笔记 (.eon)"}</span>
            <Download size={18} className="text-warm-steel" />
          </button>
          <button onClick={handleImportClick} disabled={importing}
            className="w-full flex items-center justify-between px-3 py-3 rounded-btn hover:bg-canvas-warm transition-colors">
            <span className="text-sm text-deep-ink">{importing ? "正在导入..." : "导入笔记 (.eon)"}</span>
            <Upload size={18} className="text-warm-steel" />
          </button>
          <input ref={fileInputRef} type="file" accept=".eon" onChange={handleFileSelected} className="hidden" />
          {importResult && (
            <div className={"text-sm px-3 py-2 rounded-btn " + (importResult.success
              ? "bg-emerald/10 text-emerald border border-emerald/20"
              : "bg-rose/10 text-rose border border-rose/20")}>
              {importResult.success
                ? (importResult.message || "成功导入 " + importResult.count + " 条笔记")
                : "导入失败：" + importResult.message}
            </div>
          )}
          <button onClick={() => {
              useFolderStore.getState().loadFolders();
              setShowFolderManager(true);
            }}
            className="w-full flex items-center justify-between px-3 py-3 rounded-btn hover:bg-canvas-warm transition-colors">
            <span className="text-sm text-deep-ink">文件夹管理</span>
            <Folder size={18} className="text-warm-steel" />
          </button>
          <button onClick={() => { setShowRecycleBin(true); }}
            className="w-full flex items-center justify-between px-3 py-3 rounded-btn hover:bg-canvas-warm transition-colors">
            <span className="text-sm text-deep-ink">回收站</span>
            <Archive size={18} className="text-warm-steel" />
          </button>
          <button onClick={() => setShowConfirm(true)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-btn hover:bg-red-50 transition-colors">
            <span className="text-sm text-rose">清空数据</span>
            <Trash2 size={18} className="text-rose" />
          </button>
        </div>
      </section>

      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">更多设置</h2>
        <div className="space-y-5">
          <RangeSlider label="导航栏通透度" value={tabBarOpacity}
            onChange={(v) => setTabBarOpacity(v)} min={10} max={90} step={5}
            labels={["通透", "半透", "微透", "厚重"]} formatValue={(v) => v + "%"} />
        </div>
      </section>

      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">通知提醒</h2>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {notifStatus.anyEnabled ? (
              <Bell size={16} className="text-emerald" />
            ) : (
              <BellOff size={16} className="text-rose" />
            )}
            <span className="text-sm text-deep-ink">
              {notifStatus.anyEnabled ? "通知已开启" : "通知未开启"}
            </span>
          </div>
          {!notifStatus.anyEnabled && (
            <button onClick={async () => {
              await requestNotificationPermission();
              setNotifStatus(await checkNotificationPermission());
            }}
              className="px-3 py-1.5 text-xs font-medium bg-emerald text-white rounded-btn hover:bg-emerald-dark transition-colors">
              开启通知
            </button>
          )}
        </div>
        <p className="text-xs text-warm-steel">
          开启后，笔记设置的提醒将在指定时间通过系统通知提醒你
        </p>
        <p className="text-xs text-faded-slate mt-1">
          浏览器: {notifStatus.web ? "已授权" : "未授权"} · 原生: {notifStatus.native ? "已授权" : "未授权"}
        </p>
      </section>

      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">关于</h2>
        <p className="text-sm font-mono text-faded-slate">版本 0.2</p>
        <p className="text-sm text-warm-steel mt-1">成就总数: 60</p>
        <p className="text-xs text-faded-slate mt-1">数据模型 v2（支持笔记类型/置顶/回收站）</p>
      </section>

      <p className="text-center text-xs text-faded-slate mt-8">地球Online 笔记成就系统</p>

      {/* Folder Manager */}
      {showFolderManager && (
        <div className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-deep-ink">文件夹管理</h3>
              <button onClick={() => setShowFolderManager(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas-warm">
                <X size={18} className="text-warm-steel" />
              </button>
            </div>

            {/* Add new folder */}
            <div className="flex gap-2 mb-4">
              <input type="text" value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newFolderName.trim()) {
                    addFolder(newFolderName.trim());
                    setNewFolderName("");
                  }
                }}
                placeholder="新建文件夹..."
                className="flex-1 px-3 py-2 text-sm border border-scribe rounded-input bg-surface text-deep-ink placeholder-faded-slate outline-none focus:ring-2 focus:ring-emerald" />
              <button onClick={() => {
                if (newFolderName.trim()) {
                  addFolder(newFolderName.trim());
                  setNewFolderName("");
                }
              }} disabled={!newFolderName.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-btn bg-emerald text-white hover:bg-emerald-dark transition-colors disabled:opacity-40 shrink-0">
                <Plus size={16} />
              </button>
            </div>

            {/* Folder list */}
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {folders.map((f) => {
                const isDefault = DEFAULT_FOLDERS.some((d) => d.id === f.id);
                return (
                  <div key={f.id} className="flex items-center gap-2 py-2 px-2 rounded-btn hover:bg-canvas-warm group">
                    <Folder size={16} className="text-faded-slate shrink-0" />
                    {editingFolderId === f.id ? (
                      <input autoFocus value={editingFolderLabel}
                        onChange={(e) => setEditingFolderLabel(e.target.value)}
                        onBlur={() => {
                          if (editingFolderLabel.trim()) renameFolder(f.id, editingFolderLabel.trim());
                          setEditingFolderId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (editingFolderLabel.trim()) renameFolder(f.id, editingFolderLabel.trim());
                            setEditingFolderId(null);
                          }
                          if (e.key === "Escape") setEditingFolderId(null);
                        }}
                        className="flex-1 px-2 py-0.5 text-sm border border-emerald rounded bg-white text-deep-ink outline-none" />
                    ) : (
                      <span className="flex-1 text-sm text-deep-ink">{f.label}</span>
                    )}
                    {isDefault ? (
                      <span className="text-[0.65rem] text-faded-slate">默认</span>
                    ) : (
                      <>
                        <button onClick={() => { setEditingFolderId(f.id); setEditingFolderLabel(f.label); }}
                          className="shrink-0 opacity-0 group-hover:opacity-100 text-faded-slate hover:text-deep-ink transition-all">
                          <Edit3 size={12} />
                        </button>
                        <button onClick={() => removeFolder(f.id)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 text-faded-slate hover:text-rose transition-all">
                          <X size={12} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
      {/* Recycle Bin Modal */}
      {showRecycleBin && (
        <div className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-modal p-6 max-w-lg w-full shadow-soft max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-deep-ink">回收站</h3>
              <button onClick={() => setShowRecycleBin(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas-warm">
                <X size={18} className="text-warm-steel" />
              </button>
            </div>
            {loadingRecycle ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-emerald/30 border-t-emerald rounded-full animate-spin" />
              </div>
            ) : deletedNotes.length === 0 ? (
              <div className="text-center py-12">
                <Archive size={32} className="text-faded-slate mx-auto mb-3" />
                <p className="text-sm text-warm-steel">回收站是空的</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                {deletedNotes.map((note) => (
                  <div key={note.id} className="flex items-center gap-3 p-3 rounded-btn bg-canvas-warm">
                    <FileText size={16} className="text-faded-slate shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-deep-ink truncate">{note.title || "无标题"}</p>
                      <p className="text-xs text-faded-slate">
                        删除于 {new Date(note.deletedAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                    <button onClick={() => handleRestore(note.id)}
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-emerald/10 text-emerald transition-colors"
                      title="恢复">
                      <RefreshCw size={14} />
                    </button>
                    <button onClick={() => handlePermanentDelete(note.id)}
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose/10 text-rose transition-colors"
                      title="永久删除">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {showExportPwd && (
        <div className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft">
            <h3 className="text-lg font-bold text-deep-ink mb-2">设置导出密码</h3>
            <p className="text-sm text-warm-steel mb-4">输入密码加密笔记文件，导入时需使用相同密码</p>
            <input type="password" value={pwdInput}
              onChange={(e) => { setPwdInput(e.target.value); setPwdError(""); }}
              placeholder="输入导出密码"
              className="w-full px-3 py-2.5 border border-scribe rounded-input bg-surface text-deep-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald font-mono mb-2" />
            {pwdError && <p className="text-xs text-rose mb-3">{pwdError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowExportPwd(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink hover:bg-canvas-warm">
                <X size={16} /> 取消
              </button>
              <button onClick={handleExportConfirm}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald text-white rounded-btn text-sm hover:bg-emerald-dark">
                <Lock size={16} /> 加密导出
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showImportPwd && (
        <div className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft">
            <h3 className="text-lg font-bold text-deep-ink mb-2">输入密码</h3>
            <p className="text-sm text-warm-steel mb-4">输入导出时设置的密码来解密笔记文件</p>
            <input type="password" value={pwdInput}
              onChange={(e) => { setPwdInput(e.target.value); setPwdError(""); }}
              placeholder="输入密码"
              className="w-full px-3 py-2.5 border border-scribe rounded-input bg-surface text-deep-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald font-mono mb-2" />
            {pwdError && <p className="text-xs text-rose mb-3">{pwdError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowImportPwd(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink hover:bg-canvas-warm">
                <X size={16} /> 取消
              </button>
              <button onClick={handleImportConfirm}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald text-white rounded-btn text-sm hover:bg-emerald-dark">
                <KeyRound size={16} /> 解密导入
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft">
            <h3 className="text-lg font-bold text-deep-ink mb-2">确认清空</h3>
            <p className="text-sm text-warm-steel mb-6">此操作将删除所有笔记和设置数据，且不可恢复。确定要继续吗？</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink hover:bg-canvas-warm">
                <X size={16} /> 取消
              </button>
              <button onClick={handleClearData}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose text-white rounded-btn text-sm hover:bg-red-600">
                <Trash2 size={16} /> 确认清空
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}