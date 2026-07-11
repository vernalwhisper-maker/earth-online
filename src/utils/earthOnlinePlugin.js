// 地球Online 原生插件 JS 桥接
// 对应 Android: EarthOnlinePlugin.java (com.earthonline.app)
// 提供可靠的闹钟调度，使用 Android AlarmManager.setAlarmClock()

import { registerPlugin } from "@capacitor/core";

const EarthOnline = registerPlugin("EarthOnline");

export async function nativeScheduleNotification({ id, title, body, at }) {
  try {
    await EarthOnline.scheduleNotification({ id, title, body, at });
    return true;
  } catch (err) {
    console.warn("nativeScheduleNotification failed:", err);
    return false;
  }
}

export async function nativeCancelNotification(id) {
  try {
    await EarthOnline.cancelNotification({ id });
    return true;
  } catch (err) {
    console.warn("nativeCancelNotification failed:", err);
    return false;
  }
}

export async function nativeCancelAllNotifications() {
  try {
    await EarthOnline.cancelAllNotifications();
    return true;
  } catch (err) {
    console.warn("nativeCancelAllNotifications failed:", err);
    return false;
  }
}
