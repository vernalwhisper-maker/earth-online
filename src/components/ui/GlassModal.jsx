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

// 居中模式动画（保持原风格：scale 弹入 spring）
const modalAnimCenter = {
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

// 底部模式动画（自下而上滑入）
const modalAnimBottom = {
  hidden: { y: 48, opacity: 0, scale: 0.94 },
  visible: {
    y: 0, opacity: 1, scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 30 },
  },
  exit: {
    y: 48, opacity: 0, scale: 0.94,
    transition: { type: "tween", ease: "easeIn", duration: 0.15 },
  },
};

/**
 * 通用毛玻璃弹窗组件（统一磨砂规范）
 * - variant="center"：屏幕居中（scale 弹入），用于确认/选择类对话框
 * - variant="bottom"：底部导航栏上方居中（自下而上滑入），用于听写/总结/结果类浮层
 * 视觉统一：24px 圆角、blur 磨砂、深浅自适应背景与双层边框、顶部高光。
 * 使用窗口调试参数（useWindowParams），动画风格与历史版本保持一致。
 */
export default function GlassModal({ show, onClose, children, className = "", variant = "center", contentClassName = "" }) {
  const p = useWindowParams();
  const isDark = useSettingsStore((s) => s.darkMode === "dark" || (s.darkMode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));

  if (!show) return null;

  const isBottom = variant === "bottom";
  const anim = isBottom ? modalAnimBottom : modalAnimCenter;

  // 浅色/深色模式使用不同背景：深色用深蓝灰磨砂玻璃（保证文字对比度），浅色用白色磨砂
  const bgColor = isDark
    ? `rgba(35, 46, 60, ${Math.min(p.bgOpacity + 0.72, 0.94)})`
    : `rgba(255, 255, 255, ${Math.min(p.bgOpacity + 0.7, 0.95)})`;
  const borderColor = isDark
    ? `rgba(255, 255, 255, ${Math.max(p.borderOpacity - 0.05, 0.08)})`
    : `rgba(0, 0, 0, ${Math.min(p.borderOpacity * 0.5, 0.15)})`;

  return (
    <motion.div
      className={`fixed inset-0 z-50 flex ${isBottom ? "items-end" : "items-center"} justify-center px-4`}
      variants={overlay}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* 遮罩 — 浅色更轻，深色更深 */}
      <motion.div className={`absolute inset-0 ${isDark ? "bg-black/55" : "bg-black/30"}`} onClick={onClose} />

      {/* 磨砂卡片 */}
      <motion.div
        className={`relative w-full ${isBottom ? "mb-24 max-w-sm" : "max-w-sm"} rounded-[1.5rem] overflow-hidden ${className}`}
        variants={anim}
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
            background: isDark
              ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)"
              : "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
          }}
        />
        {/* 外层边框 */}
        <div className="absolute inset-0 rounded-[1.5rem] border" style={{ borderColor }} />
        {/* 内层边框 */}
        <div
          className="absolute inset-[1px] rounded-[1.5rem] border"
          style={{ borderColor: isDark ? `rgba(255,255,255,${Math.min(p.borderOpacity + 0.15, 0.5)})` : `rgba(0,0,0,${Math.min(p.borderOpacity * 0.3 + 0.05, 0.2)})` }}
        />
        {/* 底部模式拖动条 */}
        {isBottom && (
          <div className="relative z-10 pt-3 pb-0 flex justify-center pointer-events-none">
            <div className="w-9 h-1 rounded-full" style={{ background: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)" }} />
          </div>
        )}
        {/* 内容 */}
        <div
          className={`relative z-10 p-6 ${contentClassName}`}
          style={{ textShadow: p.blurPx > 20 ? (isDark ? "none" : "0 1px 4px rgba(0,0,0,0.15)") : "none" }}
        >
          {typeof children === "function" ? children({ onClose }) : children}
        </div>
      </motion.div>
    </motion.div>
  );
}
