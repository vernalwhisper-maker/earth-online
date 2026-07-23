import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Upload, Trash2, RotateCcw, X, Lock, KeyRound, Bug } from "lucide-react";
import RangeSlider from "../../components/ui/RangeSlider";
import GlassSwitch from "../../components/ui/GlassSwitch";
import useSettingsStore from "../../store/settingsStore";
import useNoteStore from "../../store/noteStore";
import { getAllNotes, importAllNotes, clearAllData } from "../../db";
import { exportToEonBlob, generateFilename, parseEonFile, exportToMarkdownBlob, generateBatchMarkdownFilename, parseMarkdownFile } from "../../utils/notesFile";
import { Filesystem, Directory } from "@capacitor/filesystem";

export default function MoreSettingsPage({ onBack }) {
  const {
    tabBarOpacity, setTabBarOpacity,
    advancedDebug, setAdvancedDebug,
    debugFABEnabled, setDebugFABEnabled,
    debugTagBarEnabled, setDebugTagBarEnabled,
    debugNavBarEnabled, setDebugNavBarEnabled,
    debugFabGlassEnabled, setDebugFabGlassEnabled,
    devUnlocked, setDevUnlocked,
    devCardOpen, setDevCardOpen,
    closeDevCard,
  } = useSettingsStore();
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showExportPwd, setShowExportPwd] = useState(false);
  const [showImportPwd, setShowImportPwd] = useState(false);
  const [showExportFormat, setShowExportFormat] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState("");
  const fileInputRef = useRef(null);
  const pendingFileRef = useRef(null);

  // 开发者模式连点触发 — 全部在 useEffect 中驱动，不在 render 阶段调 setState
  const [devTapCount, setDevTapCount] = useState(0);
  const devTimerRef = useRef(null);

  const handleTitleTap = useCallback(() => {
    setDevTapCount((prev) => prev + 1);
    if (devTimerRef.current) clearTimeout(devTimerRef.current);
    devTimerRef.current = setTimeout(() => {
      setDevTapCount(0);
      devTimerRef.current = null;
    }, 600);
  }, []);

  // 7 次连点 → 解锁 + 自动开启卡片（useEffect 驱动，无 render 阶段 setState）
  useEffect(() => {
    if (devTapCount >= 7 && !devUnlocked) {
      setDevTapCount(0);
      setDevUnlocked(true);
      setDevCardOpen(true);
    }
  }, [devTapCount, devUnlocked, setDevUnlocked, setDevCardOpen]);

  // 标题开关关闭 → 联动关闭 Store 中所有调试状态
  const handleDevCardToggle = (open) => {
    if (open) {
      setDevCardOpen(true);
    } else {
      closeDevCard(); // 隐藏卡片 + 重置触发 + 关闭 advancedDebug / debugFABEnabled
    }
  };

  const saveBlob = async (blob, filename) => {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsDataURL(blob);
    });
    try {
      await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Documents });
      setImportResult({ success: true, count: 0, message: "已保存到 Documents/\n" + filename });
    } catch (docErr) {
      console.warn("Documents write failed:", docErr);
      await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
      const result = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
      setImportResult({ success: true, count: 0, message: "已保存到缓存:\n" + result.uri });
    }
  };

  const doExportMarkdown = async () => {
    setShowExportFormat(false);
    setExporting(true); setImportResult(null);
    try {
      const notes = await getAllNotes();
      const blob = exportToMarkdownBlob(notes);
      const filename = generateBatchMarkdownFilename();
      await saveBlob(blob, filename);
      setImportResult((prev) => prev.success ? { ...prev, count: notes.length, message: prev.message + `（共 ${notes.length} 条笔记）` } : prev);
    } catch (err) {
      setImportResult({ success: false, message: err.message || "导出失败" });
    }
    setExporting(false);
  };

  const doExport = async (password) => {
    setExporting(true); setImportResult(null);
    try {
      const notes = await getAllNotes();
      const blob = await exportToEonBlob(notes, password);
      const filename = generateFilename();

      await saveBlob(blob, filename);
      setImportResult((prev) => prev.success ? { ...prev, count: notes.length } : prev);
    } catch (err) {
      setImportResult({ success: false, message: err.message || "导出失败" });
    }
    setExporting(false);
  };

  const doImport = async (password) => {
    const file = pendingFileRef.current; if (!file) return;
    setImporting(true); setImportResult(null);
    try {
      const notes = await parseEonFile(file, password);
      const count = await importAllNotes(notes);
      await loadNotes();
      setImportResult({ success: true, count });
    } catch (err) { setImportResult({ success: false, message: err.message }); }
    setImporting(false);
  };

  const doImportMarkdown = async () => {
    const file = pendingFileRef.current; if (!file) return;
    setImporting(true); setImportResult(null);
    try {
      const text = await file.text();
      const notes = parseMarkdownFile(text);
      if (notes.length === 0) {
        setImportResult({ success: false, message: "未找到有效笔记内容" });
        setImporting(false);
        return;
      }
      const count = await importAllNotes(notes);
      await loadNotes();
      setImportResult({ success: true, count });
    } catch (err) { setImportResult({ success: false, message: err.message || "导入失败" }); }
    setImporting(false);
  };

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    pendingFileRef.current = f;
    e.target.value = "";
    // 根据文件扩展名自动选择解析方式
    const isMd = f.name.endsWith(".md") || f.name.endsWith(".MD");
    if (isMd) {
      doImportMarkdown();
    } else {
      setPwdInput("");
      setPwdError("");
      setShowImportPwd(true);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="px-4 pt-4 pb-6 max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-warm-steel mb-4 hover:text-deep-ink transition-colors">
        <ArrowLeft size={16} />返回
      </button>
      <h1 className="text-[1.5rem] font-bold text-deep-ink mb-6" onClick={handleTitleTap}>更多设置</h1>

      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">更多设置</h2>
        <div className="space-y-5">
          <div className={debugNavBarEnabled ? "pointer-events-none opacity-40" : ""}>
            <RangeSlider label="导航栏通透度" value={tabBarOpacity}
              onChange={(v) => setTabBarOpacity(v)} min={10} max={90} step={5}
              labels={["通透", "半透", "微透", "厚重"]} formatValue={(v) => v + "%"} />
            {debugNavBarEnabled && <p className="text-[10px] text-faded-slate -mt-1">调试模式已接管导航栏外观</p>}
          </div>
        </div>
      </section>

      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">数据管理</h2>
        <div className="space-y-3">
          <button onClick={() => setShowExportFormat(true)} disabled={exporting}
            className="w-full flex items-center justify-between px-3 py-3 rounded-btn hover:bg-canvas-warm transition-colors">
            <span className="text-sm text-deep-ink">{exporting ? "正在导出..." : "导出笔记"}</span><Download size={18} className="text-warm-steel" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={importing}
            className="w-full flex items-center justify-between px-3 py-3 rounded-btn hover:bg-canvas-warm transition-colors">
            <span className="text-sm text-deep-ink">{importing ? "正在导入..." : "导入笔记"}</span><Upload size={18} className="text-warm-steel" />
          </button>
          <input ref={fileInputRef} type="file" accept=".eon,.md" onChange={handleFileSelect} className="hidden" />
          {importResult && (
            <div className={"text-sm px-3 py-2 rounded-btn " + (importResult.success ? "bg-emerald/10 text-emerald border border-emerald/20" : "bg-rose/10 text-rose border border-rose/20")}>
              {importResult.success ? (importResult.message || "成功导入 " + importResult.count + " 条笔记") : "导入失败：" + importResult.message}
            </div>
          )}

          {/* 导出格式选择 */}
          {showExportFormat && (
            <div className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft">
                <h3 className="text-lg font-bold text-deep-ink mb-2">导出笔记</h3>
                <p className="text-sm text-warm-steel mb-4">选择导出格式</p>
                <div className="space-y-2">
                  <button onClick={() => { setShowExportFormat(false); setPwdInput(""); setPwdError(""); setShowExportPwd(true); }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-btn hover:bg-canvas-warm transition-colors border border-scribe">
                    <div className="text-left">
                      <span className="text-sm font-medium text-deep-ink">eon 格式（.eon）</span>
                      <p className="text-[11px] text-warm-steel mt-0.5">加密导出全部笔记，需设置密码</p>
                    </div>
                    <Lock size={16} className="text-faded-slate" />
                  </button>
                  <button onClick={doExportMarkdown}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-btn hover:bg-canvas-warm transition-colors border border-scribe">
                    <div className="text-left">
                      <span className="text-sm font-medium text-deep-ink">M 格式（.md）</span>
                      <p className="text-[11px] text-warm-steel mt-0.5">导出全部笔记为 Markdown 合集，无需密码</p>
                    </div>
                    <span className="text-xs text-faded-slate font-mono">Markdown</span>
                  </button>
                </div>
                <button onClick={() => setShowExportFormat(false)}
                  className="w-full mt-4 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink hover:bg-canvas-warm transition-colors">
                  <X size={16} className="inline mr-1" />取消
                </button>
              </motion.div>
            </div>
          )}

          <button onClick={() => setShowConfirm(true)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-btn hover:bg-red-50 transition-colors">
            <span className="text-sm text-rose">清空数据</span><Trash2 size={18} className="text-rose" />
          </button>
        </div>
      </section>

      {/* 开发者模式 — 高级调试 (状态全部来自 Store，不受页面退出影响) */}
      {devCardOpen && (
        <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-faded-slate">
              <Bug size={14} />高级调试
            </h2>
            <GlassSwitch value={devCardOpen} onChange={(v) => handleDevCardToggle(v)} />
          </div>
          <div className="space-y-3">
            {/* 总开关 */}
            <div className="flex items-center justify-between px-2 py-2">
              <div>
                <span className="text-sm text-deep-ink">启用调试</span>
                <p className="text-[11px] text-warm-steel mt-0.5">总开关，开启后应用下方已启用的详细功能</p>
              </div>
              <GlassSwitch value={advancedDebug} onChange={async (v) => { await setAdvancedDebug(v); }} />
            </div>
            {/* 副开关 + 入口 */}
            <div className="flex items-center justify-between px-3 py-3 rounded-btn hover:bg-canvas-warm transition-colors">
              <span className="text-sm text-deep-ink">表/类/夹调试</span>
              <div className="flex items-center gap-2 shrink-0">
                <GlassSwitch value={debugFABEnabled} onChange={async (v) => { await setDebugFABEnabled(v); }} />
                <button onClick={() => onBack?.("debug")}
                  className="px-2.5 py-1 text-xs font-medium bg-emerald/10 text-emerald rounded-full hover:bg-emerald/20 transition-colors">
                  进入
                </button>
              </div>
            </div>
            {/* 标签栏调试 */}
            <div className="flex items-center justify-between px-3 py-3 rounded-btn hover:bg-canvas-warm transition-colors">
              <span className="text-sm text-deep-ink">标签栏调试</span>
              <div className="flex items-center gap-2 shrink-0">
                <GlassSwitch value={debugTagBarEnabled} onChange={async (v) => { await setDebugTagBarEnabled(v); }} />
                <button onClick={() => onBack?.("debug-tagbar")}
                  className="px-2.5 py-1 text-xs font-medium bg-emerald/10 text-emerald rounded-full hover:bg-emerald/20 transition-colors">
                  进入
                </button>
              </div>
            </div>
            {/* 导航栏调试 */}
            <div className="flex items-center justify-between px-3 py-3 rounded-btn hover:bg-canvas-warm transition-colors">
              <span className="text-sm text-deep-ink">导航栏调试</span>
              <div className="flex items-center gap-2 shrink-0">
                <GlassSwitch value={debugNavBarEnabled} onChange={async (v) => { await setDebugNavBarEnabled(v); }} />
                <button onClick={() => onBack?.("debug-navbar")}
                  className="px-2.5 py-1 text-xs font-medium bg-emerald/10 text-emerald rounded-full hover:bg-emerald/20 transition-colors">
                  进入
                </button>
              </div>
            </div>
            {/* 新建/AI按钮调试 */}
            <div className="flex items-center justify-between px-3 py-3 rounded-btn hover:bg-canvas-warm transition-colors">
              <span className="text-sm text-deep-ink">新建/AI按钮调试</span>
              <div className="flex items-center gap-2 shrink-0">
                <GlassSwitch value={debugFabGlassEnabled} onChange={async (v) => { await setDebugFabGlassEnabled(v); }} />
                <button onClick={() => onBack?.("debug-fab")}
                  className="px-2.5 py-1 text-xs font-medium bg-emerald/10 text-emerald rounded-full hover:bg-emerald/20 transition-colors">
                  进入
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {showExportPwd && (<div className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft"><h3 className="text-lg font-bold text-deep-ink mb-2">设置导出密码</h3><p className="text-sm text-warm-steel mb-4">输入密码加密笔记文件</p><input type="password" value={pwdInput} onChange={(e) => { setPwdInput(e.target.value); setPwdError(""); }} placeholder="输入导出密码" className="w-full px-3 py-2.5 border border-scribe rounded-input bg-surface text-deep-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald font-mono mb-2" />{pwdError && <p className="text-xs text-rose mb-3">{pwdError}</p>}<div className="flex gap-3"><button onClick={() => setShowExportPwd(false)} className="flex-1 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink"><X size={16} className="inline mr-1" />取消</button><button onClick={() => { const pw = pwdInput.trim(); if (!pw || pw.length < 4) { setPwdError("密码至少4位"); return; } setShowExportPwd(false); doExport(pw); }} className="flex-1 py-2.5 bg-emerald text-white rounded-btn text-sm"><Lock size={16} className="inline mr-1" />加密导出</button></div></motion.div></div>)}
      {showImportPwd && (<div className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft"><h3 className="text-lg font-bold text-deep-ink mb-2">输入密码</h3><p className="text-sm text-warm-steel mb-4">输入导出时设置的密码</p><input type="password" value={pwdInput} onChange={(e) => { setPwdInput(e.target.value); setPwdError(""); }} placeholder="输入密码" className="w-full px-3 py-2.5 border border-scribe rounded-input bg-surface text-deep-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald font-mono mb-2" />{pwdError && <p className="text-xs text-rose mb-3">{pwdError}</p>}<div className="flex gap-3"><button onClick={() => setShowImportPwd(false)} className="flex-1 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink"><X size={16} className="inline mr-1" />取消</button><button onClick={() => { const pw = pwdInput.trim(); if (!pw) { setPwdError("请输入密码"); return; } setShowImportPwd(false); doImport(pw); }} className="flex-1 py-2.5 bg-emerald text-white rounded-btn text-sm"><KeyRound size={16} className="inline mr-1" />解密导入</button></div></motion.div></div>)}
      {showConfirm && (<div className="fixed inset-0 bg-deep-ink/60 flex items-center justify-center z-50 px-4"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft"><h3 className="text-lg font-bold text-deep-ink mb-2">确认清空</h3><p className="text-sm text-warm-steel mb-6">将删除所有笔记和设置数据</p><div className="flex gap-3"><button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink"><X size={16} className="inline mr-1" />取消</button><button onClick={async () => { await clearAllData(); localStorage.removeItem("earth-online-achievements"); window.location.reload(); }} className="flex-1 py-2.5 bg-rose text-white rounded-btn text-sm"><Trash2 size={16} className="inline mr-1" />确认清空</button></div></motion.div></div>)}
    </motion.div>
  );
}
