import { motion } from "framer-motion";

// 借鉴 liquid_glass_widgets GlassSwitch 的液态玻璃设计语言
// iOS 26 风格：毛玻璃轨道 + 高光旋钮 + 弹簧物理

const springKnob = { type: "spring", stiffness: 520, damping: 30, mass: 0.55 };

export default function GlassSwitch({ value, onChange, id, ariaLabel }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel || "切换"}
      onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#2a2a2a] cursor-pointer group shrink-0"
    >
      {/* ============================================ */}
      {/* Glass Track — 毛玻璃轨道                     */}
      {/* 开启：emerald 渐变 + 发光                     */}
      {/* 关闭：灰色半透明玻璃 + blur                    */}
      {/* ============================================ */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden transition-all duration-[400ms]"
        style={{
          background: value
            ? "linear-gradient(135deg, rgba(16,185,129,0.92), rgba(5,150,105,0.82))"
            : "linear-gradient(135deg, rgba(200,199,194,0.5), rgba(180,179,174,0.3))",
          boxShadow: value
            ? "inset 0 1px 3px rgba(0,0,0,0.1), 0 0 14px rgba(16,185,129,0.18)"
            : "inset 0 1px 2px rgba(0,0,0,0.06)",
        }}
      >
        {/* 玻璃 blur 层 */}
        <div
          className="absolute inset-0 transition-all duration-[400ms]"
          style={{
            backdropFilter: value ? "blur(5px)" : "blur(2px)",
            WebkitBackdropFilter: value ? "blur(5px)" : "blur(2px)",
          }}
        />

        {/* 轨道顶部 specular 边缘高光 */}
        <div
          className="absolute top-0 left-2 right-2 h-[0.5px] rounded-full transition-opacity duration-[400ms]"
          style={{
            opacity: value ? 1 : 0.4,
            background: "linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)",
          }}
        />

        {/* 暗黑模式适配 — 关闭状态轨道更深色 */}
        <div
          className="absolute inset-0 rounded-full transition-opacity duration-[400ms] dark:opacity-60"
          style={{
            opacity: 0,
          }}
        />
      </div>

      {/* ============================================ */}
      {/* Glass Knob — 玻璃旋钮                        */}
      {/* 多层叠加：白色基底 + specular 高光 + 底部阴影 */}
      {/* ============================================ */}
      <motion.div
        animate={value ? { x: 20 } : { x: 0 }}
        transition={springKnob}
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full z-10 overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(255,255,255,0.7))",
          boxShadow: "0 1px 3px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.9)",
        }}
      >
        {/* 旋钮顶部 specular 高光 — 液态玻璃标志性效果 */}
        <div className="absolute top-[1.5px] left-[3px] right-[3px] h-[2px] rounded-full"
          style={{
            background: "linear-gradient(to right, transparent, rgba(255,255,255,0.8) 30%, rgba(255,255,255,0.8) 70%, transparent)",
          }} />

        {/* 旋钮底部内阴影 — 增加立体厚度感 */}
        <div className="absolute bottom-0 left-1 right-1 h-[1px] rounded-full"
          style={{
            background: "linear-gradient(to right, transparent, rgba(0,0,0,0.06), transparent)",
          }} />

        {/* 开启时旋钮的 emerald 环境光反射 */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ opacity: value ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: "radial-gradient(circle at 40% 35%, rgba(16,185,129,0.08), transparent 70%)",
          }}
        />
      </motion.div>

      {/* ============================================ */}
      {/* Hover 效果 — 微妙的扩大光圈                  */}
      {/* ============================================ */}
      <div
        className="absolute -inset-1.5 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
        style={{
          background: value
            ? "radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)"
            : "radial-gradient(circle, rgba(0,0,0,0.03), transparent 70%)",
        }}
      />
    </button>
  );
}
