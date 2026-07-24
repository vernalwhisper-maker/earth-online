import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function ImageViewer({ images, current, onClose }) {
  const total = images.length;
  const img = images[current];
  const hasMultiple = total > 1;

  // ESC 关闭
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const goPrev = (e) => { e.stopPropagation(); if (current > 0) onClose(current - 1); };
  const goNext = (e) => { e.stopPropagation(); if (current < total - 1) onClose(current + 1); };

  // 将 onClose 改造为支持新索引
  const close = () => onClose(-1);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        onClick={close}
      >
        {/* 关闭按钮 */}
        <button onClick={close}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
          <X size={22} className="text-white" />
        </button>

        {/* 计数 */}
        {hasMultiple && (
          <span className="absolute top-5 left-1/2 -translate-x-1/2 text-sm text-white/60 z-10">
            {current + 1} / {total}
          </span>
        )}

        {/* 左箭头 */}
        {hasMultiple && current > 0 && (
          <button onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
            <ChevronLeft size={24} className="text-white" />
          </button>
        )}

        {/* 右箭头 */}
        {hasMultiple && current < total - 1 && (
          <button onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
            <ChevronRight size={24} className="text-white" />
          </button>
        )}

        {/* 图片 */}
        <motion.img
          key={current}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          src={img?.uri}
          alt={img?.name || ""}
          className="max-w-full max-h-full object-contain select-none"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </motion.div>
    </AnimatePresence>
  );
}
