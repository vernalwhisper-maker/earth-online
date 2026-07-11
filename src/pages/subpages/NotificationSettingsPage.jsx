import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, BellOff } from "lucide-react";
import { checkNotificationPermission, requestNotificationPermission } from "../../utils/notifications";

export default function NotificationSettingsPage({ onBack }) {
  const [notifStatus, setNotifStatus] = useState({ native: false, web: false, anyEnabled: false });

  useEffect(() => { checkNotificationPermission().then(setNotifStatus); }, []);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="px-4 pt-4 pb-6 max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-warm-steel mb-4 hover:text-deep-ink transition-colors">
        <ArrowLeft size={16} />返回
      </button>
      <h1 className="text-[1.5rem] font-bold text-deep-ink mb-6">通知设置</h1>

      <section className="bg-surface rounded-card border border-scribe p-4 mb-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-faded-slate mb-4">通知提醒</h2>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {notifStatus.anyEnabled ? <Bell size={16} className="text-emerald" /> : <BellOff size={16} className="text-rose" />}
            <span className="text-sm text-deep-ink">{notifStatus.anyEnabled ? "通知已开启" : "通知未开启"}</span>
          </div>
          {!notifStatus.anyEnabled && (
            <button onClick={async () => { await requestNotificationPermission(); setNotifStatus(await checkNotificationPermission()); }}
              className="px-3 py-1.5 text-xs font-medium bg-emerald text-white rounded-btn hover:bg-emerald-dark transition-colors">开启通知</button>
          )}
        </div>
        <p className="text-xs text-warm-steel">开启后，笔记设置的提醒将在指定时间通过系统通知提醒你</p>
        <p className="text-xs text-faded-slate mt-1">浏览器: {notifStatus.web ? "已授权" : "未授权"} · 原生: {notifStatus.native ? "已授权" : "未授权"}</p>
      </section>
    </motion.div>
  );
}
