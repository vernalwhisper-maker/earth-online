import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import useToastStore from "../../store/toastStore";

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const COLORS = {
  success: "bg-emerald text-white",
  error: "bg-rose text-white",
  info: "bg-warm-steel text-white",
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || Info;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              className={"pointer-events-auto flex items-start gap-2.5 px-3.5 py-3 rounded-btn shadow-soft text-sm " + (COLORS[toast.type] || COLORS.info)}
            >
              <Icon size={16} className="shrink-0 mt-0.5" />
              <span className="flex-1">{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}