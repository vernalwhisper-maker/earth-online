// 笔记提醒通知服务
// 引擎（按优先级）：
//   1. 原生 Android AlarmManager.setAlarmClock() — 最高可靠性
//   2. Capacitor Local Notifications — 兼容层
//   3. Web Notification API — 兜底

import {
  nativeScheduleNotification,
  nativeCancelNotification,
} from "./earthOnlinePlugin";

const SCHEDULE_KEY = "earth-online-scheduled-reminders";
const CHANNEL_ID = "earth-online-reminders";

let LocalNotifications = null;

async function getLN() {
  if (LocalNotifications === undefined) {
    try {
      const mod = await import("@capacitor/local-notifications");
      LocalNotifications = mod.LocalNotifications;
    } catch {
      LocalNotifications = null;
    }
  }
  return LocalNotifications;
}

// 创建通知渠道（Android 必需）
async function ensureChannel() {
  const ln = await getLN();
  if (!ln) return false;
  try {
    await ln.createChannel({
      id: CHANNEL_ID,
      name: "笔记提醒",
      description: "地球Online 笔记提醒",
      importance: 5,
      visibility: 1,
      sound: "default",
      vibration: true,
    });
    return true;
  } catch (e) {
    console.warn("Channel creation (JS):", e);
    return false;
  }
}

// === 原生调度引擎（使用 AlarmManager.setAlarmClock）===

async function scheduleNative(noteId, title, body, dateStr) {
  if (!noteId || !dateStr) return false;

  const timestamp = new Date(dateStr).getTime();
  if (timestamp <= Date.now()) return false;

  // 1. 优先使用自定义原生插件（setAlarmClock，最高可靠性）
  const ok = await nativeScheduleNotification({
    id: noteId,
    title: title || "地球Online",
    body: body || "",
    at: timestamp,
  });
  if (ok) return true;

  // 2. 回退到 Capacitor Local Notifications 插件
  const ln = await getLN();
  if (!ln) return false;

  try {
    await ensureChannel();
    const perm = await ln.checkPermissions();
    if (perm.display !== "granted") {
      const req = await ln.requestPermissions();
      if (req.display !== "granted") return false;
    }
    await ln.schedule({
      notifications: [{
        id: hashId(noteId),
        title: title || "地球Online",
        body: body || "你有笔记待查看",
        schedule: { at: new Date(dateStr), allowWhileIdle: true },
        channelId: CHANNEL_ID,
        smallIcon: "ic_stat_note",
        sound: "default",
        extra: { noteId },
      }],
    });
    return true;
  } catch (err) {
    console.warn("scheduleNative (Capacitor fallback):", err);
    return false;
  }
}

async function cancelNative(noteId) {
  if (!noteId) return;

  // 1. 取消原生闹钟
  await nativeCancelNotification(noteId);

  // 2. 同时取消 Capacitor 的调度
  const ln = await getLN();
  if (ln) {
    try {
      await ln.cancel({ notifications: [{ id: hashId(noteId) }] });
    } catch { }
  }
}

// === Web 引擎备用 ===
function getMap() {
  try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY)) || {}; } catch { return {}; }
}
function setMap(m) {
  try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(m)); } catch { }
}
const timers = {};

function scheduleWeb(noteId, title, body, dateStr) {
  const target = new Date(dateStr).getTime();
  const delay = target - Date.now();
  if (delay <= 0) { triggerWeb(title, body, noteId); return; }
  cancelWeb(noteId);
  const m = getMap(); m[noteId] = { title, body, remindAt: dateStr }; setMap(m);
  timers[noteId] = setTimeout(() => {
    triggerWeb(title, body, noteId);
    const mm = getMap(); delete mm[noteId]; setMap(mm);
    delete timers[noteId];
  }, delay);
}

function cancelWeb(noteId) {
  if (timers[noteId]) { clearTimeout(timers[noteId]); delete timers[noteId]; }
  const m = getMap(); if (m[noteId]) { delete m[noteId]; setMap(m); }
}

async function triggerWeb(title, body, noteId) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title || "地球Online", { body: body || "", tag: "note-" + noteId, icon: "/icons/favicon.png" });
  } else if (Notification.permission !== "denied") {
    const p = await Notification.requestPermission();
    if (p === "granted") {
      new Notification(title || "地球Online", { body: body || "", tag: "note-" + noteId, icon: "/icons/favicon.png" });
    }
  }
}

function hashId(str) {
  if (!str) return 0;
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return Math.abs(h) % 2147483647;
}

export async function scheduleReminder(noteId, title, body, remindDate) {
  if (!noteId || !remindDate) return;
  await cancelReminder(noteId);
  const ok = await scheduleNative(noteId, title, body, remindDate);
  if (!ok) scheduleWeb(noteId, title, body, remindDate);
}

export async function cancelReminder(noteId) {
  if (!noteId) return;
  await cancelNative(noteId);
  cancelWeb(noteId);
}

export async function checkNotificationPermission() {
  const ln = await getLN();
  let native = false;
  if (ln) { try { const p = await ln.checkPermissions(); native = p.display === "granted"; } catch { } }
  const web = "Notification" in window && Notification.permission === "granted";
  return { native, web, anyEnabled: native || web };
}

export async function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission();
  const ln = await getLN();
  if (ln) { try { await ln.requestPermissions(); await ensureChannel(); } catch { } }
}

export function restoreScheduledReminders() {
  if (typeof window === "undefined") return;
  const m = getMap(); const now = Date.now();
  for (const [id, info] of Object.entries(m)) {
    const t = new Date(info.remindAt).getTime();
    const d = t - now;
    if (d <= 0) { triggerWeb(info.title, info.body, id); delete m[id]; }
    else { timers[id] = setTimeout(() => { triggerWeb(info.title, info.body, id); delete m[id]; setMap(getMap()); delete timers[id]; }, d); }
  }
  setMap(m);
}
