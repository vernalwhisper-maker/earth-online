// 笔记提醒通知服务
// 双引擎：原生 Capacitor Local Notifications + Web Notification API 兜底

const SCHEDULE_KEY = "earth-online-scheduled-reminders";

let LocalNotificationsModule = null;

// 延迟加载原生模块
async function getNativeModule() {
  if (LocalNotificationsModule === undefined) {
    try {
      const mod = await import("@capacitor/local-notifications");
      LocalNotificationsModule = mod.LocalNotifications;
    } catch {
      LocalNotificationsModule = null;
    }
  }
  return LocalNotificationsModule;
}

// ========== 原生引擎（Capacitor） ==========

async function scheduleNative(noteId, title, body, dateStr) {
  const LN = await getNativeModule();
  if (!LN) return false;
  try {
    await LN.requestPermissions();
    await LN.schedule({
      notifications: [
        {
          id: hashId(noteId),
          title: title || "地球Online 提醒",
          body: body || "你有未完成的笔记待查看",
          schedule: { at: new Date(dateStr) },
          sound: "default",
          extra: { noteId },
        },
      ],
    });
    return true;
  } catch (err) {
    console.warn("Native notification failed:", err);
    return false;
  }
}

async function cancelNative(noteId) {
  const LN = await getNativeModule();
  if (!LN) return;
  try {
    await LN.cancel({ notifications: [{ id: hashId(noteId) }] });
  } catch (err) {
    console.warn("Cancel native notification failed:", err);
  }
}

// ========== Web 引擎（备用） ==========

function getScheduledMap() {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveScheduledMap(map) {
  try {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

const webTimers = {};

function scheduleWeb(noteId, title, body, dateStr) {
  const now = Date.now();
  const target = new Date(dateStr).getTime();
  const delay = target - now;

  if (delay <= 0) {
    triggerWebNotification(title, body, noteId);
    return;
  }

  cancelWeb(noteId);

  const map = getScheduledMap();
  map[noteId] = { title, body, remindAt: dateStr };
  saveScheduledMap(map);

  webTimers[noteId] = setTimeout(() => {
    triggerWebNotification(title, body, noteId);
    const m = getScheduledMap();
    delete m[noteId];
    saveScheduledMap(m);
    delete webTimers[noteId];
  }, delay);
}

function cancelWeb(noteId) {
  if (webTimers[noteId]) {
    clearTimeout(webTimers[noteId]);
    delete webTimers[noteId];
  }
  const map = getScheduledMap();
  if (map[noteId]) {
    delete map[noteId];
    saveScheduledMap(map);
  }
}

async function triggerWebNotification(title, body, noteId) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title || "地球Online 提醒", {
      body: body || "你有未完成的笔记待查看",
      tag: "note-" + noteId,
      icon: "/icons/favicon.png",
    });
  } else if (Notification.permission !== "denied") {
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      new Notification(title || "地球Online 提醒", {
        body: body || "你有未完成的笔记待查看",
        tag: "note-" + noteId,
        icon: "/icons/favicon.png",
      });
    }
  }
}

// ========== 公共接口 ==========

function hashId(str) {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 2147483647;
}

/** 调度提醒通知 */
export async function scheduleReminder(noteId, title, body, remindDate) {
  if (!noteId || !remindDate) return;
  await cancelReminder(noteId);
  const nativeOk = await scheduleNative(noteId, title, body, remindDate);
  if (!nativeOk) {
    scheduleWeb(noteId, title, body, remindDate);
  }
}

/** 取消提醒通知 */
export async function cancelReminder(noteId) {
  if (!noteId) return;
  await cancelNative(noteId);
  cancelWeb(noteId);
}

/** 检查通知权限状态 */
export async function checkNotificationPermission() {
  const LN = await getNativeModule();
  let native = false;
  if (LN) {
    try {
      const perm = await LN.checkPermissions();
      native = perm.display === "granted";
    } catch { /* */ }
  }
  const web = "Notification" in window && Notification.permission === "granted";
  return { native, web, anyEnabled: native || web };
}

/** 请求通知权限 */
export async function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
  const LN = await getNativeModule();
  if (LN) {
    try {
      await LN.requestPermissions();
    } catch { /* */ }
  }
}

/** 恢复未触发的定时器（应用启动时调用） */
export function restoreScheduledReminders() {
  if (typeof window === "undefined") return;
  const map = getScheduledMap();
  const now = Date.now();
  for (const [noteId, info] of Object.entries(map)) {
    const target = new Date(info.remindAt).getTime();
    const delay = target - now;
    if (delay <= 0) {
      triggerWebNotification(info.title, info.body, noteId);
      delete map[noteId];
    } else {
      webTimers[noteId] = setTimeout(() => {
        triggerWebNotification(info.title, info.body, noteId);
        delete map[noteId];
        saveScheduledMap(getScheduledMap());
        delete webTimers[noteId];
      }, delay);
    }
  }
  saveScheduledMap(map);
}