import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw, Wifi, Cpu, Smartphone, Download, Check, X, CheckCircle, AlertCircle, Loader, Upload } from "lucide-react";
import RangeSlider from "../../components/ui/RangeSlider";
import GlassSwitch from "../../components/ui/GlassSwitch";
import GlassModal from "../../components/ui/GlassModal";
import useSettingsStore from "../../store/settingsStore";
import { API_PROVIDERS, ONLINE_MODELS } from "../../config/api";

const TABS = [
  { key: "online", label: "在线", icon: Wifi },
  { key: "ollama", label: "Ollama", icon: Cpu },
  { key: "webllm", label: "WebLLM", icon: Smartphone },
];

const WEBLLM_MODELS = [
  { value: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5-1.5B", size: "~1GB" },
  { value: "Qwen2.5-3B-Instruct-q4f16_1-MLC", label: "Qwen2.5-3B", size: "~2GB" },
];

const springTap = { type: "spring", stiffness: 500, damping: 11, mass: 0.55 };

export default function AISettingsPage({ onBack }) {
  const store = useSettingsStore();
  const { loaded, useMode, setUseMode } = store;
  // 深色模式判断（设置页内嵌样式适配用）
  const isDark = store.darkMode === "dark" || (store.darkMode === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const wb = store; // 下载状态快捷引用
  const webllmCancelRef = useRef(null);
  const [webgpuOk, setWebgpuOk] = useState(null);

  // 弹窗状态
  const [showOnlinePicker, setShowOnlinePicker] = useState(false);
  const [showWebllmPicker, setShowWebllmPicker] = useState(false);

  // API Key 验证
  const [testingKey, setTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null); // null | "ok" | "fail"

  // Ollama 连通性测试
  const [testingOllama, setTestingOllama] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState(null); // null | { ok, msg }

  // WebLLM 引擎测试
  const [webllmTestStatus, setWebllmTestStatus] = useState(null); // null | "ok" | "fail"

  // 模型 zip 导入状态
  const [importingModel, setImportingModel] = useState(false);
  const [importProgress, setImportProgress] = useState(null); // { phase, pct, file }
  const [importResult, setImportResult] = useState(null); // { ok, message }
  const [cacheStats, setCacheStats] = useState(null); // 缓存诊断
  const modelZipRef = useRef(null);

  // 缓存诊断：查看 web-llm 各缓存 scope 的条目（确认导入是否生效）
  const handleCacheDiagnose = async () => {
    const { getWebLLMCacheStats } = await import("../../utils/webllm");
    setCacheStats(await getWebLLMCacheStats());
  };

  useEffect(() => {
    if (typeof navigator !== "undefined" && "gpu" in navigator) {
      navigator.gpu.requestAdapter().then((adapter) => setWebgpuOk(!!adapter));
    } else {
      setWebgpuOk(false);
    }
  }, []);

  const testApiKey = async () => {
    if (!store.apiKey) return;
    setTestingKey(true);
    setKeyStatus(null);
    const cfg = API_PROVIDERS[store.modelProvider] || API_PROVIDERS.deepseek;
    try {
      const resp = await fetch(cfg.endpoint, {
        method: "POST",
        headers: { "Authorization": "Bearer " + store.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: "hi" }], max_tokens: 5 }),
        signal: AbortSignal.timeout(8000),
      });
      setKeyStatus(resp.ok ? "ok" : "fail");
    } catch { setKeyStatus("fail"); }
    setTestingKey(false);
  };

  const testOllama = async () => {
    setTestingOllama(true);
    setOllamaStatus(null);
    try {
      const ep = (store.localEndpoint || "http://localhost:11434").replace(/\/+$/, "");
      const isLocalDev = ep.includes("localhost") || ep.includes("127.0.0.1");
      const proxyPath = isLocalDev ? "/ollama" : ep;
      const resp = await fetch(proxyPath + "/api/tags", { signal: AbortSignal.timeout(5000) });
      if (resp.ok) {
        const data = await resp.json();
        const models = data.models?.map((m) => m.name).join(", ") || "无模型";
        setOllamaStatus({ ok: true, msg: `已连接 · 模型: ${models}` });
      } else {
        setOllamaStatus({ ok: false, msg: `服务返回 ${resp.status} ${resp.statusText}` });
      }
    } catch (e) {
      setOllamaStatus({ ok: false, msg: `无法连接: ${e.message}` });
    }
    setTestingOllama(false);
  };

  // WebLLM 引擎测试：点击时主动初始化引擎并验证（比只查内存状态更真实）
  const [webllmTestError, setWebllmTestError] = useState("");

  const testWebLLM = async () => {
    setWebllmTestStatus("testing");
    setWebllmTestError("");
    // 无可用模型（未导入且未下载）时不自动初始化，避免删除模型后误报"就绪"
    const hasModel = (store.webllmImported && store.webllmImportedModel === store.webllmModel) || store.webllmDownloaded;
    if (!hasModel) {
      setWebllmTestStatus("fail");
      setWebllmTestError("模型未导入/未下载，请先导入模型或在线下载");
      return;
    }
    try {
      const { ensureEngine, getLastError } = await import("../../utils/webllm");
      const ok = await ensureEngine();
      if (ok) {
        setWebllmTestStatus("ok");
      } else {
        setWebllmTestStatus("fail");
        setWebllmTestError(getLastError() || "引擎初始化失败");
      }
    } catch (err) {
      setWebllmTestStatus("fail");
      setWebllmTestError(err?.message || "引擎初始化异常");
    }
  };

  const handleDownloadWebLLM = async () => {
    if (wb.webllmBusy) return;
    store.setWebllmBusy(true);
    store.setWebllmProgress(0);
    store.setWebllmSpeed("");
    store.setWebllmEta("");
    const startTime = Date.now();
    let lastPct = 0;

    const { initWebLLM, cancelDownload, wasCancelled, getLastError } = await import("../../utils/webllm");
    webllmCancelRef.current = cancelDownload;
    const ok = await initWebLLM(store.webllmModel, (pct, text) => {
      store.setWebllmProgress(pct);
      store.setWebllmStatusText(text || "");
      if (pct > 0 && pct !== lastPct) {
        const elapsed = (Date.now() - startTime) / 1000;
        store.setWebllmSpeed((pct / elapsed).toFixed(1) + "%/s");
        if (pct > 5) {
          const remaining = ((100 - pct) / pct) * elapsed;
          const mins = Math.floor(remaining / 60);
          const secs = Math.floor(remaining % 60);
          store.setWebllmEta(mins > 0 ? mins + "分" + secs + "秒" : secs + "秒");
        }
        lastPct = pct;
      }
    });
    if (ok) await store.setWebllmDownloaded(true);
    else store.setWebllmStatusText(wasCancelled() ? "下载已取消" : (getLastError() || "下载失败，请检查网络或重试"));
    store.setWebllmBusy(false);
  };

  const handleCancelDownload = async () => {
    const { cancelAndClear } = await import("../../utils/webllm");
    await cancelAndClear();
    store.resetWebllmDownload();
  };

  const handleDeleteModel = async () => {
    // 彻底删除当前模型的本地缓存（不影响其他已导入模型）
    const { deleteModelCache } = await import("../../utils/webllm");
    const deleted = await deleteModelCache(store.webllmModel);
    await store.setWebllmDownloaded(false);
    await store.setWebllmImported(false);
    await store.setWebllmImportedModel("");
    store.resetWebllmDownload();
    setImportResult({ ok: true, message: `已彻底删除模型（清理 ${deleted} 个缓存条目）` });
  };

  // 从 zip 导入模型到本地缓存（离线可用，无需 VPN 下载）
  // 自动识别模型并锁定；导入后立即初始化引擎（零等待），显示进度
  const handleImportModelZip = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportingModel(true);
    setImportResult(null);
    setImportProgress({ phase: "读取压缩包", pct: 0, file: "" });
    try {
      const { importModelFromZip, ensureEngine, getLastError } = await import("../../utils/webllm");
      const res = await importModelFromZip(file, store.webllmModel, (p) => setImportProgress(p));
      if (res.ok) {
        const importedId = res.detectedModelId || store.webllmModel;
        // 自动识别模型：写入导入记录并锁定（缓存按模型 URL 前缀隔离）
        await store.setWebllmImportedModel(importedId);
        await store.setWebllmImported(true);
        if (res.detectedModelId && res.detectedModelId !== store.webllmModel) {
          await store.setWebllmModel(res.detectedModelId);
        }
        // 导入后立即初始化引擎（离线缓存命中，快速完成），聊天时零等待
        setImportProgress({ phase: "初始化引擎", pct: 0, file: "" });
        const initOk = await ensureEngine((pct, text) =>
          setImportProgress({ phase: "初始化引擎", pct, file: text || "" })
        );
        // 导入缓存已同时写入国际源与国内镜像双前缀；若下载源是自定义（空 URL），自动切到国际源
        if (store.webllmSource === "custom" && !store.webllmCustomUrl) {
          await store.setWebllmSource("hf");
        }
        if (initOk) {
          setImportResult({ ok: true, message: `导入完成，模型已就绪（离线可用）：${importedId}（${res.files} 个文件）` });
        } else {
          setImportResult({ ok: false, message: `导入完成（${res.files} 个文件），但引擎初始化失败：${getLastError() || "未知错误"}（可在 AI 助手聊天时自动重试）` });
        }
      } else {
        setImportResult({ ok: false, message: res.message || "导入失败" });
      }
    } catch (err) {
      setImportResult({ ok: false, message: "导入异常：" + (err?.message || "未知错误") });
    }
    setImportingModel(false);
    setImportProgress(null);
  };

  const [scanResults, setScanResults] = useState(null);
  const [scanning, setScanning] = useState(false);
  const handleScanResidue = async () => {
    setScanning(true);
    setScanResults(null);
    const { scanModelCache, clearModelCache } = await import("../../utils/webllm");
    const residues = await scanModelCache(store.webllmModel);
    setScanResults(residues);
    setScanning(false);
  };
  const handleCleanResidue = async () => {
    const { clearModelCache } = await import("../../utils/webllm");
    await clearModelCache(store.webllmModel);
    setScanResults([]);
  };

  if (!loaded) {
    return <div className="px-4 pt-4"><div className="w-10 h-10 border-2 border-emerald/30 border-t-emerald rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="px-4 pt-4 pb-6 max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-warm-steel mb-4 hover:text-deep-ink transition-colors">
        <ArrowLeft size={16} />返回
      </button>
      <h1 className="text-[1.5rem] font-bold text-deep-ink mb-4">AI 设置</h1>

      {/* 模式 Tab */}
      <div className="flex bg-scribe/20 rounded-[1rem] p-1 mb-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = useMode === tab.key;
          return (
            <motion.button
              key={tab.key}
              onClick={() => setUseMode(tab.key)}
              className={"flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[0.8rem] text-sm font-medium transition-colors " +
                (isActive ? "bg-surface text-deep-ink shadow-sm" : "text-faded-slate hover:text-warm-steel")}
              whileTap={{ scale: 0.95 }}
            >
              <Icon size={15} />
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      {/* ===== 在线模式 ===== */}
      {useMode === "online" && (
        <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">在线模型</h2>
          <div className="space-y-4">
            {/* 模型选择 - 玻璃弹窗 */}
            <div>
              <label className="block text-sm font-medium text-deep-ink mb-1.5">模型选择</label>
              <motion.button
                onClick={() => setShowOnlinePicker(true)}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-scribe rounded-input text-sm"
                style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.02)", color: isDark ? "#ffffff" : "#1c1b1a" }}>
                <span>{ONLINE_MODELS.find((m) => m.value === store.modelProvider)?.label || "选择模型"}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}><path d="m6 9 6 6 6-6"/></svg>
              </motion.button>
            </div>

            {/* API Key + 测试 */}
            <div>
              <label className="block text-sm font-medium text-deep-ink mb-1.5">API Key</label>
              <div className="flex gap-2">
                <input type="password" value={store.apiKey} onChange={(e) => { store.setApiKey(e.target.value); setKeyStatus(null); }}
                  placeholder="输入 API Key..."
                  className="flex-1 px-3 py-2.5 border border-scribe rounded-input bg-surface text-deep-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald font-mono" />
                <motion.button
                  onClick={testApiKey}
                  disabled={!store.apiKey || testingKey}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-2.5 rounded-input text-sm font-medium border border-scribe hover:bg-canvas-warm transition-colors disabled:opacity-40"
                >
                  {testingKey ? <Loader size={16} className="animate-spin" /> : "测试"}
                </motion.button>
              </div>
            </div>

            {/* 状态提示 */}
            <div className="flex items-center gap-2 text-sm">
              {keyStatus === "ok" && <><CheckCircle size={14} className="text-emerald" /><span className="text-emerald">连接成功</span></>}
              {keyStatus === "fail" && <><AlertCircle size={14} className="text-rose" /><span className="text-rose">连接失败，请检查 API Key</span></>}
              {!keyStatus && store.apiKey && <><Check size={14} className="text-faded-slate" /><span className="text-faded-slate">已填写</span></>}
              {!store.apiKey && <><span className="text-faded-slate">未配置</span></>}
            </div>
          </div>
        </section>
      )}

      {/* ===== Ollama 本地模式 ===== */}
      {useMode === "ollama" && (
        <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">本地 Ollama</h2>
          <p className="text-xs text-warm-steel mb-4">需要电脑安装 Ollama 并运行模型，App 通过局域网调用。</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-deep-ink mb-1.5">模型名</label>
              <input type="text" value={store.localModel} onChange={(e) => store.setLocalModel(e.target.value)}
                placeholder="qwen2.5:1.5b"
                className="w-full px-3 py-2.5 border border-scribe rounded-input bg-surface text-deep-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-deep-ink mb-1.5">服务地址</label>
              <input type="text" value={store.localEndpoint} onChange={(e) => store.setLocalEndpoint(e.target.value)}
                placeholder="输入服务地址"
                className="w-full px-3 py-2.5 border border-scribe rounded-input bg-surface text-deep-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald font-mono" />
            </div>

            {/* 连接测试 */}
            <div className="flex items-center gap-2">
              <button onClick={testOllama} disabled={testingOllama}
                className="px-3 py-2 rounded-input text-sm font-medium border border-scribe hover:bg-canvas-warm transition-colors disabled:opacity-40">
                {testingOllama ? "测试中..." : "测试连接"}
              </button>
              <div className="flex items-center gap-1.5 text-xs">
                {ollamaStatus && (
                  ollamaStatus.ok
                    ? <><CheckCircle size={12} className="text-emerald" /><span className="text-emerald">{ollamaStatus.msg}</span></>
                    : <><AlertCircle size={12} className="text-rose" /><span className="text-rose max-w-[200px] truncate">{ollamaStatus.msg}</span></>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== WebLLM 本地模式 ===== */}
      {useMode === "webllm" && (
        <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">WebLLM (浏览器内运行)</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <div className={"w-2 h-2 rounded-full " + (webgpuOk === true ? "bg-emerald" : webgpuOk === false ? "bg-rose" : "bg-warm-steel")} />
              <span className="text-warm-steel">
                {webgpuOk === null ? "检测 WebGPU..." : webgpuOk ? "WebGPU 可用" : "WebGPU 不可用，请使用 Chrome 113+"}
              </span>
              {/* 引擎测试 */}
              <button onClick={testWebLLM} disabled={webllmTestStatus === "testing"}
                className="ml-auto px-2.5 py-1 rounded-full text-xs font-medium border border-scribe hover:bg-canvas-warm transition-colors disabled:opacity-50">
                {webllmTestStatus === "testing" ? "检测中..." : "检测引擎"}
              </button>
              {webllmTestStatus === "ok" && <CheckCircle size={12} className="text-emerald shrink-0" />}
              {webllmTestStatus === "fail" && <AlertCircle size={12} className="text-rose shrink-0" />}
            </div>
            {webllmTestStatus === "ok" && (
              <p className="flex items-center gap-1.5 text-xs text-emerald mt-1.5">
                <CheckCircle size={13} className="shrink-0" /> 引擎就绪（当前模型可用）
              </p>
            )}
            {webllmTestStatus === "fail" && (
              <p className="flex items-center gap-1.5 text-xs text-rose mt-1.5">
                <AlertCircle size={13} className="shrink-0" /> {webllmTestError || "引擎不可用"}
              </p>
            )}

            {/* 模型选择 - 玻璃弹窗 */}
            <div>
              <label className="block text-sm font-medium text-deep-ink mb-1.5">模型</label>
              <motion.button
                onClick={() => setShowWebllmPicker(true)}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-scribe rounded-input text-sm"
                style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.02)", color: isDark ? "#ffffff" : "#1c1b1a" }}>
                <span>{WEBLLM_MODELS.find((m) => m.value === store.webllmModel)?.label || "选择模型"}</span>
                <span className="text-xs text-faded-slate">{WEBLLM_MODELS.find((m) => m.value === store.webllmModel)?.size}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}><path d="m6 9 6 6 6-6"/></svg>
              </motion.button>
            </div>

            {/* 下载源选择（WebLLM 真正生效：HuggingFace 国际源 / hf-mirror 国内镜像 / 自定义 URL） */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-faded-slate">下载源</span>
              <div className="flex bg-scribe/20 rounded-lg p-0.5">
                <button onClick={() => store.setWebllmSource("hf")}
                  className={"px-2.5 py-1 text-xs rounded-md transition-colors " + (store.webllmSource === "hf" ? "bg-surface text-deep-ink shadow-sm" : "text-faded-slate")}>
                  国际源
                </button>
                <button onClick={() => store.setWebllmSource("mirror")}
                  className={"px-2.5 py-1 text-xs rounded-md transition-colors " + (store.webllmSource === "mirror" ? "bg-surface text-deep-ink shadow-sm" : "text-faded-slate")}>
                  国内镜像
                </button>
                <button onClick={() => store.setWebllmSource("custom")}
                  className={"px-2.5 py-1 text-xs rounded-md transition-colors " + (store.webllmSource === "custom" ? "bg-surface text-deep-ink shadow-sm" : "text-faded-slate")}>
                  自定义
                </button>
              </div>
            </div>
            {store.webllmSource === "custom" && (
              <div>
                <label className="block text-xs text-faded-slate mb-1.5">模型权重目录 URL</label>
                <input type="text" value={store.webllmCustomUrl}
                  onChange={(e) => store.setWebllmCustomUrl(e.target.value)}
                  placeholder="https://your-host/models/resolve/main/"
                  className="w-full px-3 py-2.5 border border-scribe rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-emerald"
                  style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.02)", color: isDark ? "#ffffff" : "#1c1b1a" }} />
                <p className="text-[11px] text-faded-slate mt-1">URL 需以 /resolve/main/ 结尾，或你的目录内包含该子目录结构</p>
              </div>
            )}

            {/* 已导入模型状态（按模型区分） */}
            {store.webllmImported && store.webllmImportedModel === store.webllmModel && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald/5 border border-emerald/20">
                <Check size={15} className="text-emerald shrink-0" />
                <span className="text-xs text-emerald font-medium">已离线导入当前模型（离线可用）</span>
              </div>
            )}
            {store.webllmImported && store.webllmImportedModel && store.webllmImportedModel !== store.webllmModel && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue/5 border border-blue/20">
                <Check size={15} className="text-blue shrink-0" />
                <span className="text-xs text-blue font-medium">已导入其他模型（${(store.webllmImportedModel || "").replace("Qwen2.5-", "").replace("-Instruct-q4f16_1-MLC", "")}），切换到它可直接离线使用</span>
              </div>
            )}

            {/* 导入模型 zip（离线安装，无需 VPN 下载） */}
            <div>
              <button onClick={() => modelZipRef.current?.click()} disabled={importingModel}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-scribe text-sm text-deep-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                {importingModel ? "导入中..." : <><Upload size={15} />导入模型 zip（离线安装）</>}
              </button>
              <input ref={modelZipRef} type="file" accept=".zip,application/zip" onChange={handleImportModelZip} className="hidden" />
              {importingModel && importProgress && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-faded-slate">{importProgress.phase}</span>
                    <span className="text-xs text-faded-slate font-mono">{importProgress.pct}%</span>
                  </div>
                  <div className="h-2 bg-scribe/30 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald rounded-full transition-all duration-300" style={{ width: importProgress.pct + "%" }} />
                  </div>
                  {importProgress.file && <p className="text-xs text-faded-slate mt-1 truncate">{importProgress.file}</p>}
                </div>
              )}
              {importResult && (
                <p className={"text-xs mt-2 " + (importResult.ok ? "text-emerald" : "text-rose")}>{importResult.message}</p>
              )}
              <p className="text-[11px] text-faded-slate mt-1.5">zip 内文件需在根目录（mlc-chat-config.json 直接可见）；切换下载源后需重新导入</p>
            </div>

            {/* 缓存诊断（排障用） */}
            <div>
              <button onClick={handleCacheDiagnose}
                className="text-[11px] text-faded-slate underline hover:text-warm-steel transition-colors">
                缓存诊断
              </button>
              {cacheStats && (
                <div className="mt-1.5 text-[11px] font-mono text-faded-slate space-y-0.5">
                  {Object.entries(cacheStats).map(([k, v]) => (
                    <div key={k}>
                      {k}: {typeof v === "object" ? (v.error ? "无法访问" : v.count + " 项" + (v.sample?.[0] ? " · " + v.sample[0].slice(0, 70) : "")) : String(v)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 下载/状态：在线下载完成 或 当前模型已离线导入 → 就绪 */}
            {store.webllmDownloaded || (store.webllmImported && store.webllmImportedModel === store.webllmModel) ? (
              <div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald/5 border border-emerald/20">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-emerald" />
                    <span className="text-sm text-emerald font-medium">{store.webllmImported && store.webllmImportedModel === store.webllmModel ? "模型已就绪（离线）" : "模型已下载"}</span>
                  </div>
                  <button onClick={handleDeleteModel}
                    className="text-xs text-rose bg-rose/10 px-3 py-1.5 rounded-full hover:bg-rose/20 transition-colors">删除模型</button>
                </div>
              </div>
            ) : (
              <div>
                <button onClick={handleDownloadWebLLM} disabled={wb.webllmBusy || webgpuOk === false}
                  className={"w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors " +
                    (wb.webllmBusy ? "bg-emerald/10 text-emerald" : "bg-emerald text-white hover:bg-emerald-dark")}>
                  {wb.webllmBusy ? <>{wb.webllmProgress}% 下载中...</> : <><Download size={16} />下载 {WEBLLM_MODELS.find((m) => m.value === store.webllmModel)?.label} ({WEBLLM_MODELS.find((m) => m.value === store.webllmModel)?.size}, 建议 Wi-Fi)</>}
                </button>
                {wb.webllmBusy && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 h-2 bg-scribe/30 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald rounded-full transition-all duration-300" style={{ width: wb.webllmProgress + "%" }} />
                      </div>
                      <button onClick={handleCancelDownload}
                        className="ml-2 text-xs text-rose bg-rose/10 px-2.5 py-1 rounded-full hover:bg-rose/20 transition-colors">
                        取消
                      </button>
                    </div>
                    {/* 下载信息 */}
                    <div className="flex justify-between mt-1">
                      {wb.webllmSpeed && <span className="text-xs text-faded-slate font-mono">{wb.webllmSpeed}</span>}
                      {wb.webllmEta && <span className="text-xs text-faded-slate font-mono">预计 {wb.webllmEta}</span>}
                    </div>
                    {wb.webllmStatusText && <p className="text-xs text-faded-slate mt-1 truncate">{wb.webllmStatusText}</p>}
                  </div>
                )}
              </div>
            )}

            {/* 缓存管理 */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-faded-slate">AI 模型缓存及残留</span>
              <div className="flex gap-1.5">
                <button onClick={handleScanResidue} disabled={scanning}
                  className="text-xs text-amber bg-amber/10 px-2.5 py-1 rounded-full hover:bg-amber/20 transition-colors disabled:opacity-40">
                  {scanning ? "扫描中..." : "扫描"}
                </button>
                <button onClick={async () => {
                  try {
                    const dbs = await indexedDB.databases?.() || [];
                    for (const db of dbs) {
                      if (db.name && (db.name.includes("transformers") || db.name.includes("huggingface"))) {
                        indexedDB.deleteDatabase(db.name);
                      }
                    }
                    useSettingsStore.getState().setWebllmDownloaded(false);
                  } catch {}
                }} className="text-xs text-rose bg-rose/10 px-2.5 py-1 rounded-full hover:bg-rose/20 transition-colors">清理缓存</button>
                {scanResults !== null && scanResults.length > 0 && (
                  <button onClick={handleCleanResidue}
                    disabled={scanResults.some((r) => r.inUse)}
                    title={scanResults.some((r) => r.inUse) ? "检测到在用模型缓存，清理会删除当前模型，请先使用「删除模型」" : "清理残留缓存"}
                    className="text-xs text-rose bg-rose/10 px-2.5 py-1 rounded-full hover:bg-rose/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    清理残留
                  </button>
                )}
              </div>
            </div>
            {scanResults !== null && (
              <div className="pt-1">
                {scanResults.length === 0 ? (
                  <p className="text-xs text-emerald">✓ 无模型残留</p>
                ) : (
                  <div className="space-y-1">
                    {scanResults.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className={"truncate " + (r.inUse ? "text-warm-steel" : "text-rose")}>
                          {r.inUse && <Check size={11} className="inline mr-1 text-emerald" />}
                          {r.type}: {r.name}
                        </span>
                        <span className="text-faded-slate ml-2">{r.size || ""}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-rose text-white text-[10px] font-bold px-1">{scanResults.length}</span>
                      <span className="text-xs text-faded-slate">个缓存项</span>
                      {scanResults.some((r) => r.inUse) && (
                        <span className="text-xs text-emerald">（含在用模型缓存，清理已禁用）</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 推理参数 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate">推理参数</h2>
          <button onClick={store.resetInference} className="flex items-center gap-1 text-xs text-faded-slate hover:text-warm-steel transition-colors">
            <RotateCcw size={12} /> 重置</button>
        </div>
        <div className="space-y-5">
          {/* 深度思考开关：仅对支持 thinking 参数的模型（DeepSeek V4）显示 */}
          {API_PROVIDERS[store.modelProvider]?.supportsThinking && (
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm text-deep-ink">深度思考</p>
                <p className="text-xs text-faded-slate mt-0.5">AI 先深度思考再回答，质量更高但响应更慢</p>
              </div>
              <GlassSwitch value={store.deepThinking} onChange={store.setDeepThinking} ariaLabel="深度思考" />
            </div>
          )}
          <RangeSlider label="温度 (Temperature)" value={store.inference.temperature}
            onChange={(v) => store.setInferenceParam("temperature", v)} min={0} max={2} step={0.05}
            labels={["精确", "平衡", "创意", "发散"]} formatValue={(v) => v.toFixed(2)} />
          <RangeSlider label="最大 Token" value={store.inference.maxTokens}
            onChange={(v) => store.setInferenceParam("maxTokens", v)} min={50} max={200} step={10}
            labels={["50", "100", "150", "200"]} formatValue={(v) => v.toString()} />
          <RangeSlider label="Top-P (核采样)" value={store.inference.topP}
            onChange={(v) => store.setInferenceParam("topP", v)} min={0} max={1} step={0.05}
            labels={["严格", "适中", "灵活", "多样"]} formatValue={(v) => v.toFixed(2)} />
        </div>
      </section>

      {/* 显示选项 */}
      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">显示选项</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-deep-ink">AI 助手按钮</p>
            <p className="text-xs text-faded-slate mt-0.5">在首页底部显示 AI 助手浮动按钮</p>
          </div>
          <GlassSwitch value={store.showAIAssistant} onChange={store.setShowAIAssistant} ariaLabel="AI 助手按钮" />
        </div>
      </section>

      {/* ===== 在线模型选择弹窗 ===== */}
      <GlassModal show={showOnlinePicker} onClose={() => setShowOnlinePicker(false)}
        className="w-[240px]" contentClassName="p-2">
        {ONLINE_MODELS.map((m) => {
          const isActive = store.modelProvider === m.value;
          return (
            <motion.button key={m.value}
              onClick={() => { store.setModelProvider(m.value); setShowOnlinePicker(false); }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
              style={{ background: isActive ? (isDark ? "rgba(51,144,236,0.2)" : "rgba(0,0,0,0.04)") : "transparent", color: isActive ? (isDark ? "#66b5f2" : "#2b7fd4") : (isDark ? "rgba(255,255,255,0.85)" : "#1c1b1a") }}>
              <span className="flex-1 text-left">{m.label}</span>
              {m.size && <span className="text-xs text-faded-slate mr-2">{m.size}</span>}
              {isActive && <Check size={14} />}
            </motion.button>
          );
        })}
      </GlassModal>

      {/* ===== WebLLM 模型选择弹窗 ===== */}
      <GlassModal show={showWebllmPicker} onClose={() => setShowWebllmPicker(false)}
        className="w-[240px]" contentClassName="p-2">
        {WEBLLM_MODELS.map((m) => {
          const isActive = store.webllmModel === m.value;
          return (
            <motion.button key={m.value}
              onClick={() => { store.setWebllmModel(m.value); setShowWebllmPicker(false); }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
              style={{ background: isActive ? (isDark ? "rgba(51,144,236,0.2)" : "rgba(0,0,0,0.04)") : "transparent", color: isActive ? (isDark ? "#66b5f2" : "#2b7fd4") : (isDark ? "rgba(255,255,255,0.85)" : "#1c1b1a") }}>
              <span className="flex-1 text-left">{m.label}</span>
              {m.size && <span className="text-xs text-faded-slate mr-2">{m.size}</span>}
              {isActive && <Check size={14} />}
            </motion.button>
          );
        })}
      </GlassModal>
    </motion.div>
  );
}
