import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code, Eye, Bold, Italic, Heading, List, Link as LinkIcon, Image } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

const TOOLBAR_ITEMS = [
  { label: "B", icon: Bold, syntax: "**", wrap: true, prefix: "**", suffix: "**", title: "粗体" },
  { label: "I", icon: Italic, syntax: "*", wrap: true, prefix: "*", suffix: "*", title: "斜体" },
  { label: "H", icon: Heading, syntax: "## ", wrap: false, prefix: "## ", suffix: "", title: "标题" },
  { label: "\u2022", icon: List, syntax: "- ", wrap: false, prefix: "- ", suffix: "", title: "列表" },
  { label: "\uD83D\uDD17", icon: LinkIcon, syntax: "[text](url)", wrap: false, prefix: "[", suffix: "](url)", title: "链接" },
  { label: "\uD83D\uDDBC", icon: Image, syntax: "![alt](url)", wrap: false, prefix: "![", suffix: "](url)", title: "图片" },
];

function insertSyntax(textarea, syntax, wrap, prefix, suffix) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);
  let insertText;
  if (wrap && selected) {
    insertText = prefix + selected + suffix;
  } else {
    insertText = prefix + suffix;
  }
  const newValue = textarea.value.substring(0, start) + insertText + textarea.value.substring(end);
  const cursorPos = wrap && selected ? start + insertText.length : start + prefix.length;
  return { newValue, cursorPos };
}

export default function MarkdownEditor({ value, onChange, minHeight = 200 }) {
  const [mode, setMode] = useState("edit");

  const handleToolbarClick = (item) => {
    const ta = document.getElementById("md-textarea");
    if (!ta) return;
    const result = insertSyntax(ta, item.syntax, item.wrap, item.prefix || "", item.suffix || "");
    if (result) {
      onChange(result.newValue);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(result.cursorPos, result.cursorPos);
      });
    }
  };

  const hasContent = value && value.trim().length > 0;

  return (
    <div className="border border-scribe rounded-card overflow-hidden bg-white/60">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-scribe bg-canvas-warm/50">
        <div className="flex items-center gap-0.5">
          {TOOLBAR_ITEMS.map((item) => (
            <button key={item.label} onClick={() => handleToolbarClick(item)}
              className="w-7 h-7 flex items-center justify-center rounded text-faded-slate hover:text-deep-ink hover:bg-white/80 transition-colors text-xs"
              title={item.title}>{item.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-scribe/20 rounded-full p-0.5">
          <button onClick={() => setMode("edit")}
            className={"px-2.5 py-1 text-xs rounded-full transition-colors " + (mode === "edit" ? "bg-white text-deep-ink shadow-sm" : "text-faded-slate")}>
            <Code size={12} className="inline mr-1" />编辑
          </button>
          <button onClick={() => setMode("preview")}
            className={"px-2.5 py-1 text-xs rounded-full transition-colors " + (mode === "preview" ? "bg-white text-deep-ink shadow-sm" : "text-faded-slate")}>
            <Eye size={12} className="inline mr-1" />预览
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === "edit" ? (
          <motion.textarea key="edit" id="md-textarea"
            value={value || ""} onChange={(e) => onChange(e.target.value)}
            placeholder="支持 Markdown 语法撰写..."
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full px-3 py-2.5 text-[0.9375rem] text-deep-ink placeholder-faded-slate bg-transparent border-none outline-none resize-none font-mono leading-relaxed"
            style={{ minHeight: minHeight + "px" }} />
        ) : (
          <motion.div key="preview"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-3 py-2.5 text-[0.9375rem] text-deep-ink leading-relaxed markdown-preview overflow-x-auto"
            style={{ minHeight: minHeight + "px" }}>
            {hasContent ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{value}</ReactMarkdown>
            ) : (
              <p className="text-faded-slate italic">暂无内容</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}