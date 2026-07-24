import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import useToastStore from "../../store/toastStore";

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const TYPE_COLORS = {
  success: "#10b981",
  error: "#e11d48",
  info: "#787775",
};

const BLUR_PX = 25;
const SATURATION = 1.6;
const BG_OPACITY = 0.08;
const BORDER_OPACITY = 0.12;
const SHADOW_OPACITY = 0.4;

const toastVariants = {
  initial: { opacity: 0, y: 16, scale: 0.92 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.92 },
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div style={{ position: "fixed", bottom: "6rem", left: "50%", transform: "translateX(-50%)", zIndex: 99999 }}
      className="flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || Info;
          const color = TYPE_COLORS[toast.type] || TYPE_COLORS.info;
          const gs = {
            background: `rgba(255,255,255,${BG_OPACITY})`,
            backdropFilter: `blur(${BLUR_PX}px) saturate(${SATURATION})`,
            border: `1px solid rgba(255,255,255,${BORDER_OPACITY})`,
            boxShadow: `0 8px 32px rgba(0,0,0,${SHADOW_OPACITY}), inset 0 1px 0 rgba(255,255,255,0.15)`,
          };
          return (
            <motion.div
              key={toast.id}
              variants={toastVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 22, mass: 0.8 }}
              className="relative w-full mb-2 rounded-[1rem] overflow-hidden pointer-events-auto"
              style={gs}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />
              <div className="flex items-start gap-2.5 px-3.5 py-3 pl-5">
                <Icon size={16} className="shrink-0 mt-0.5" style={{ color }} />
                <span className="flex-1 text-sm text-deep-ink">{toast.message}</span>
                <motion.button
                  onClick={() => removeToast(toast.id)}
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="shrink-0 opacity-50 hover:opacity-100 text-faded-slate"
                >
                  <X size={14} />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
