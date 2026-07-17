import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Wifi, Cpu, Smartphone, Download, Check, X, CheckCircle, AlertCircle, Loader } from "lucide-react";
import RangeSlider from "../../components/ui/RangeSlider";
import GlassSwitch from "../../components/ui/GlassSwitch";
import useSettingsStore from "../../store/settingsStore";

const TABS = [
  { key: "online", label: "在线", icon: Wifi },
  { key: "ollama", label: "Ollama", icon: Cpu },
  { key: "webllm", label: "WebLLM", icon: Smartphone },
];

const ONLINE_MODELS = [
  { value: "deepseek", label: "DeepSeek V4 Flash" },
  { value: "zhipu", label: "智谱 GLM-4V-Flash" },
  { value: "qwen", label: "通义千问 Qwen-VL-Plus" },
];

const WEBLLM_MODELS = [
  { value: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5-1.5B", size: "~1GB" },
  { value: "Qwen2.5-3B-Instruct-q4f16_1-MLC", label: "Qwen2.5-3B", size: "~2GB" },
];

const springTap = { type: "spring", stiffness: 500, damping: 11, mass: 0.55 };

export default function AISettingsPage({ onBack }) {
  const store = useSettingsStore();
  const { loaded, useMode, setUseMode } = store;
  const wb = store; // 下载状态快捷引用
  const webllmCancelRef = useRef(null);
  const [webgpuOk, setWebgpuOk] = useState(null);

  // 弹窗状态
  const [showOnlinePicker, setShowOnlinePicker] = useState(false);
  const [showWebllmPicker, setShowWebllmPicker] = useState(false);

  // API Key 验证
  const [testingKey, setTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null); // null | "ok" | "fail"

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
    const testConfigs = {
      deepseek: { endpoint: "https://api.deepseek.com/v1/chat/completions", model: "deepseek-chat" },
      zhipu: { endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions", model: "glm-4v-flash" },
      qwen: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", model: "qwen-vl-plus" },
    };
    const cfg = testConfigs[store.modelProvider] || testConfigs.deepseek;
    try {
      const resp = await fetch(cfg.endpoint, {
        method: "POST",
        headers: { "Authorization": "Bearer " + store.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: "hi" }], max_tokens: 5 }),
      });
      setKeyStatus(resp.ok ? "ok" : "fail");
    } catch { setKeyStatus("fail"); }
    setTestingKey(false);
  };

  const handleDownloadWebLLM = async () => {
    if (wb.webllmBusy) return;
    store.setWebllmBusy(true);
    store.setWebllmProgress(0);
    store.setWebllmSpeed("");
    store.setWebllmEta("");
    const startTime = Date.now();
    let lastPct = 0;

    const { initWebLLM, cancelDownload } = await import("../../utils/webllm");
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
    else store.setWebllmStatusText("下载失败，请检查网络或重试");
    store.setWebllmBusy(false);
  };

  const handleCancelDownload = async () => {
    const { cancelAndClear } = await import("../../utils/webllm");
    await cancelAndClear();
    store.resetWebllmDownload();
  };

  const handleDeleteModel = async () => {
    const { clearModelCache } = await import("../../utils/webllm");
    await clearModelCache(store.webllmModel);
    await store.setWebllmDownloaded(false);
    store.resetWebllmDownload();
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
                style={{ background: "rgba(0,0,0,0.02)", color: "#1c1b1a" }}>
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
            </div>

            {/* 模型选择 - 玻璃弹窗 */}
            <div>
              <label className="block text-sm font-medium text-deep-ink mb-1.5">模型</label>
              <motion.button
                onClick={() => setShowWebllmPicker(true)}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-scribe rounded-input text-sm"
                style={{ background: "rgba(0,0,0,0.02)", color: "#1c1b1a" }}>
                <span>{WEBLLM_MODELS.find((m) => m.value === store.webllmModel)?.label || "选择模型"}</span>
                <span className="text-xs text-faded-slate">{WEBLLM_MODELS.find((m) => m.value === store.webllmModel)?.size}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}><path d="m6 9 6 6 6-6"/></svg>
              </motion.button>
            </div>

            {/* 下载源选择 */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-faded-slate">下载源</span>
              <div className="flex bg-scribe/20 rounded-lg p-0.5">
                <button onClick={() => store.setUseMirror(false)}
                  className={"px-3 py-1 text-xs rounded-md transition-colors " + (!store.useMirror ? "bg-surface text-deep-ink shadow-sm" : "text-faded-slate")}>
                  国际源
                </button>
                <button onClick={() => store.setUseMirror(true)}
                  className={"px-3 py-1 text-xs rounded-md transition-colors " + (store.useMirror ? "bg-surface text-deep-ink shadow-sm" : "text-faded-slate")}>
                  国内镜像
                </button>
              </div>
            </div>

            {/* 下载/状态 */}
            {store.webllmDownloaded ? (
              <div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald/5 border border-emerald/20">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-emerald" />
                    <span className="text-sm text-emerald font-medium">模型已下载</span>
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
                    className="text-xs text-rose bg-rose/10 px-2.5 py-1 rounded-full hover:bg-rose/20 transition-colors">
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
                        <span className="text-rose truncate">{r.type}: {r.name}</span>
                        <span className="text-faded-slate ml-2">{r.size || ""}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-rose text-white text-[10px] font-bold px-1">{scanResults.length}</span>
                      <span className="text-xs text-faded-slate">个残留项</span>
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
      <AnimatePresence>
        {showOnlinePicker && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30" onClick={() => setShowOnlinePicker(false)} />
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="fixed left-1/2 -translate-x-1/2 z-40 w-[240px] rounded-[1.2rem] overflow-hidden shadow-lg"
              style={{ bottom: "calc(50% - 120px)" }}>
              <div className="absolute inset-0" style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,247,244,0.95))",
                backdropFilter: "blur(35px) saturate(200%)", WebkitBackdropFilter: "blur(35px) saturate(200%)",
              }} />
              <div className="absolute inset-0 rounded-[1.2rem] border border-white/25" />
              <div className="relative z-10 py-2">
                {ONLINE_MODELS.map((m) => {
                  const isActive = store.modelProvider === m.value;
                  return (
                    <motion.button key={m.value}
                      onClick={() => { store.setModelProvider(m.value); setShowOnlinePicker(false); }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      style={{ background: isActive ? "rgba(0,0,0,0.04)" : "transparent", color: isActive ? "#059669" : "#1c1b1a" }}>
                      <span className="flex-1 text-left">{m.label}</span>
                      {m.size && <span className="text-xs text-faded-slate mr-2">{m.size}</span>}
                      {isActive && <Check size={14} />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== WebLLM 模型选择弹窗 ===== */}
      <AnimatePresence>
        {showWebllmPicker && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30" onClick={() => setShowWebllmPicker(false)} />
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="fixed left-1/2 -translate-x-1/2 z-40 w-[240px] rounded-[1.2rem] overflow-hidden shadow-lg"
              style={{ bottom: "calc(50% - 60px)" }}>
              <div className="absolute inset-0" style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,247,244,0.95))",
                backdropFilter: "blur(35px) saturate(200%)", WebkitBackdropFilter: "blur(35px) saturate(200%)",
              }} />
              <div className="absolute inset-0 rounded-[1.2rem] border border-white/25" />
              <div className="relative z-10 py-2">
                {WEBLLM_MODELS.map((m) => {
                  const isActive = store.webllmModel === m.value;
                  return (
                    <motion.button key={m.value}
                      onClick={() => { store.setWebllmModel(m.value); setShowWebllmPicker(false); }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      style={{ background: isActive ? "rgba(0,0,0,0.04)" : "transparent", color: isActive ? "#059669" : "#1c1b1a" }}>
                      <span className="flex-1 text-left">{m.label}</span>
                      {m.size && <span className="text-xs text-faded-slate mr-2">{m.size}</span>}
                      {isActive && <Check size={14} />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
