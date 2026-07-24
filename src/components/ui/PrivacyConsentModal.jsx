import { motion, AnimatePresence } from "framer-motion";
import { Shield, Check, X } from "lucide-react";
import { PRIVACY_TEXT, setConsent } from "../../utils/privacyConsent";

export default function PrivacyConsentModal({ isOpen, onDone }) {
  if (!isOpen) return null;

  const handleAgree = () => {
    setConsent(true);
    onDone();
  };

  const handleReject = () => {
    setConsent(false);
    onDone();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-deep-ink/50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft max-h-[85vh] overflow-y-auto"
        >
          {/* 图标 */}
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald/10 flex items-center justify-center">
              <Shield size={24} className="text-emerald" />
            </div>
          </div>

          {/* 标题 */}
          <h2 className="text-lg font-bold text-deep-ink text-center mb-3">
            {PRIVACY_TEXT.title}
          </h2>

          {/* 简介 */}
          <p className="text-sm text-warm-steel mb-4 leading-relaxed">
            {PRIVACY_TEXT.intro}
          </p>

          {/* 会收集 */}
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-emerald mb-1.5">
              ✅ {PRIVACY_TEXT.what.title}
            </h3>
            <ul className="text-xs text-warm-steel space-y-0.5 pl-2">
              {PRIVACY_TEXT.what.items.map((item, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-emerald mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* 不会收集 */}
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-rose mb-1.5">
              ❌ {PRIVACY_TEXT.whatNot.title}
            </h3>
            <ul className="text-xs text-warm-steel space-y-0.5 pl-2">
              {PRIVACY_TEXT.whatNot.items.map((item, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-rose mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* 运作方式 */}
          <div className="mb-4 p-2.5 bg-canvas-warm rounded-xl">
            <h3 className="text-xs font-semibold text-deep-ink mb-1">
              {PRIVACY_TEXT.how.title}
            </h3>
            <p className="text-xs text-warm-steel leading-relaxed">
              {PRIVACY_TEXT.how.text}
            </p>
          </div>

          {/* 最终声明 */}
          <p className="text-xs text-warm-steel mb-5 text-center leading-relaxed">
            {PRIVACY_TEXT.final}
          </p>

          {/* 按钮 */}
          <div className="flex gap-3">
            <button onClick={handleReject}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-scribe rounded-btn text-sm text-warm-steel hover:bg-black/5 transition-colors">
              <X size={16} />拒绝
            </button>
            <button onClick={handleAgree}
              className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 bg-emerald text-white rounded-btn text-sm font-medium hover:bg-emerald-dark transition-colors">
              <Check size={16} />同意并继续
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
