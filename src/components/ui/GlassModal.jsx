import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { WINDOW_DEFAULTS, STORAGE_KEY_WINDOW } from "../../config/debugDefaults";
import useSettingsStore from "../../store/settingsStore";

/**
 * 读取窗口毛玻璃参数（优先调试参数，兜底默认值），自动响应调试页面变化。
 * 当 windowDebugEnabled 关闭时使用默认参数。
 */
export function useWindowParams() {
  const windowDebugEnabled = useSettingsStore((s) => s.windowDebugEnabled);
  const [params, setParams] = useState(() => {
    if (!windowDebugEnabled) return WINDOW_DEFAULTS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_WINDOW);
      if (!raw) return WINDOW_DEFAULTS;
      return { ...WINDOW_DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return WINDOW_DEFAULTS;
    }
  });

  useEffect(() => {
    if (!windowDebugEnabled) {
      setParams(WINDOW_DEFAULTS);
      return;
    }
    const handler = (e) => setParams(e.detail);
    window.addEventListener("earth-debug-window-changed", handler);
    // 重新读取 localStorage（可能在其他 Tab 中被修改）
    try {
      const raw = localStorage.getItem(STORAGE_KEY_WINDOW);
      if (raw) setParams({ ...WINDOW_DEFAULTS, ...JSON.parse(raw) });
    } catch {}
    return () => window.removeEventListener("earth-debug-window-changed", handler);
  }, [windowDebugEnabled]);

  return params;
}

const overlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const modalAnim = {
  hidden: { scale: 0.92, opacity: 0, y: 20 },
  visible: {
    scale: 1, opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25, mass: 0.8 },
  },
  exit: {
    scale: 0.92, opacity: 0, y: 20,
    transition: { duration: 0.15 },
  },
};

/**
 * 通用毛玻璃弹窗组件
 * 使用窗口调试参数，自动响应调试页面变化。
 */
export default function GlassModal({ show, onClose, children, className = "" }) {
  const p = useWindowParams();
  const isDark = useSettingsStore((s) => s.darkMode === "dark" || (s.darkMode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));

  if (!show) return null;

  // 浅色/深色模式使用不同背景透明度
  const bgColor = isDark
    ? `rgba(255,255,255,${p.bgOpacity})`
    : `rgba(255,255,255,${Math.min(p.bgOpacity + 0.7, 0.95)})`;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      variants={overlay}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* 遮罩 — 浅色模式更轻 */}
      <motion.div className={`absolute inset-0 ${isDark ? "bg-deep-ink/60" : "bg-deep-ink/30"}`} onClick={onClose} />

      {/* 毛玻璃卡片 */}
      <motion.div
        className={`relative w-full max-w-sm rounded-[1.5rem] overflow-hidden ${className}`}
        variants={modalAnim}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* 玻璃层 */}
        <div
          className="absolute inset-0"
          style={{
            background: bgColor,
            backdropFilter: `blur(${p.blurPx}px) saturate(${p.saturation})`,
            WebkitBackdropFilter: `blur(${p.blurPx}px) saturate(${p.saturation})`,
          }}
        />
        {/* 顶部高光 */}
        <div
          className="absolute top-0 left-4 right-4 h-[1.5px]"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
          }}
        />
        {/* 外层边框 */}
        <div className="absolute inset-0 rounded-[1.5rem] border" style={{ borderColor: `rgba(255,255,255,${p.borderOpacity})` }} />
        {/* 内层边框 */}
        <div
          className="absolute inset-[1px] rounded-[1.5rem] border"
          style={{ borderColor: `rgba(255,255,255,${Math.min(p.borderOpacity + 0.3, 0.9)})` }}
        />
        {/* 内容 */}
        <div
          className="relative z-10 p-6"
          style={{ textShadow: p.blurPx > 20 ? "0 1px 4px rgba(0,0,0,0.15)" : "none" }}
        >
          {typeof children === "function" ? children({ onClose }) : children}
        </div>
      </motion.div>
    </motion.div>
  );
}
