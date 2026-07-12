import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Bot, FileText, Loader } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { chatWithAI, generateSummary } from "../../utils/aiChat";
import { getChatMessages, saveChatMessage } from "../../db";
import { parseActions, stripActions, executeAction } from "../../utils/aiTools";
import useSettingsStore from "../../store/settingsStore";

export default function AIAssistant({ noteId, notes = [], folders = [], noteTitle, noteBody, noteMarkdown, onSummaryGenerated }) {
  const { modelProvider, apiKey, inference, loaded: settingsLoaded } = useSettingsStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) getChatMessages(noteId).then(setMessages);
  }, [isOpen, noteId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !apiKey) return;
    setInput("");
    const userMsg = { noteId, role: "user", content: text };
    await saveChatMessage(userMsg);
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      // 构建笔记上下文摘要供 AI 分析
      const notesForAI = notes.length > 0
        ? "以下是用户的部分笔记摘要（供你直接分析）：\n" + JSON.stringify(notes.slice(0, 15).map(n => ({
          title: n.title,
          type: n.noteType,
          snippet: (n.body || "").slice(0, 60),
          tags: n.tags,
          folder: n.folderId,
          pinned: n.isPinned,
          hasTodo: n.noteType === "todo"
        }))).slice(0, 2000)
        : null;
      const enrichedMessages = notesForAI
        ? [{ role: "system", content: notesForAI }, ...messages, userMsg]
        : [...messages, userMsg];
      const reply = await chatWithAI(
        enrichedMessages.map((m) => ({ role: m.role, content: m.content })),
        apiKey, modelProvider, inference
      );
      const cleanReply = stripActions(reply || "抱歉，我暂时无法回答。");
      const aiMsg = { noteId, role: "assistant", content: cleanReply };
      await saveChatMessage(aiMsg);
      setMessages((prev) => [...prev, aiMsg]);
      const actions = parseActions(reply);
      if (actions.length > 0) {
        const results = [];
        for (const act of actions) {
          const result = await executeAction(act, notes);
          results.push(result);
        }
        const successMsgs = results.filter((r) => r.success).map((r) => r.message);
        const failMsgs = results.filter((r) => !r.success).map((r) => r.message);
        if (successMsgs.length > 0) {
          const resultMsg = { noteId, role: "assistant", content: "✅ 已完成：\n" + successMsgs.map((m) => "- " + m).join("\n") };
          await saveChatMessage(resultMsg);
          setMessages((prev) => [...prev, resultMsg]);
        }
        if (failMsgs.length > 0) {
          const failMsg = { noteId, role: "assistant", content: "❌ 以下操作失败：\n" + failMsgs.map((m) => "- " + m).join("\n") };
          await saveChatMessage(failMsg);
          setMessages((prev) => [...prev, failMsg]);
        }
      }
    } catch {
      setMessages((prev) => [...prev, { noteId, role: "assistant", content: "连接失败，请检查网络和 API 设置。" }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSummarize = async () => {
    const content = noteMarkdown || noteBody;
    if (!content || !apiKey) return;
    setSummarizing(true);
    const summary = await generateSummary(content, apiKey, modelProvider, inference);
    if (summary) {
      const msg = { noteId, role: "assistant", content: "摘要：" + summary, type: "summary" };
      await saveChatMessage(msg);
      setMessages((prev) => [...prev, msg]);
      onSummaryGenerated?.(summary);
    } else {
      setMessages((prev) => [...prev, { noteId, role: "assistant", content: "生成摘要失败，请检查 API 配置。" }]);
    }
    setSummarizing(false);
  };

  // 设置未加载或未配置 API Key 时隐藏按钮
  if (!settingsLoaded || !apiKey) return null;

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="fixed bottom-48 right-5 w-14 h-14 bg-violet-500 rounded-full shadow-fab flex items-center justify-center z-20"
        title="AI 助手"
        style={{ willChange: 'transform' }}
      >
        <Sparkles size={20} className="text-white" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 350, damping: 25, mass: 0.9 }}
        className="fixed bottom-40 right-4 w-80 max-w-[calc(100vw-2rem)] h-96 bg-surface rounded-modal border border-scribe shadow-soft z-50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-scribe bg-violet-500/5">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-violet-500" />
                <span className="text-sm font-semibold text-deep-ink">AI 助手</span>
              </div>
              <motion.button
                onClick={() => setIsOpen(false)}
                whileTap={{ scale: 0.8 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/5"
              >
                <X size={14} className="text-warm-steel" />
              </motion.button>
            </div>

            <div className="px-3 py-2 border-b border-scribe/50 bg-canvas-warm/30">
              <button onClick={handleSummarize} disabled={summarizing}
                className="flex items-center gap-1.5 text-xs text-violet-500 hover:text-violet-600 transition-colors disabled:opacity-50">
                {summarizing ? <Loader size={12} className="animate-spin" /> : <FileText size={12} />}
                {summarizing ? "生成中..." : "生成笔记摘要"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {messages.length === 0 && (
                <p className="text-xs text-faded-slate text-center py-8">
                  你好！我是 AI 助手，可以帮你分析笔记、回答问题。
                </p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={"flex gap-2 " + (msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={"max-w-[80%] px-3 py-2 rounded-btn text-sm leading-relaxed " +
                    (msg.role === "user" ? "bg-violet-500 text-white" : "bg-canvas-warm text-deep-ink border border-scribe")}>
                    {msg.role === "user" ? msg.content : <ReactMarkdown>{msg.content}</ReactMarkdown>}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="px-3 py-2 rounded-btn text-sm bg-canvas-warm border border-scribe">
                    <Loader size={14} className="animate-spin text-violet-500" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="px-3 py-2 border-t border-scribe flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown} placeholder="问点什么..."
                className="flex-1 px-3 py-2 text-sm border border-scribe rounded-input bg-surface text-deep-ink placeholder-faded-slate outline-none focus:ring-2 focus:ring-violet-400" />
              <button onClick={handleSend} disabled={!input.trim() || loading}
                className="w-9 h-9 flex items-center justify-center rounded-btn bg-violet-500 text-white hover:bg-violet-600 transition-colors disabled:opacity-40 shrink-0">
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}