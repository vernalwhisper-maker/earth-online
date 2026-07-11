package com.earthonline.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 原生闹钟调度器。
 * 使用 AlarmManager.setAlarmClock() 设置精确闹钟，
 * 这是 Android 上最高优先级的闹钟类型，不会被 Doze 模式或
 * HyperOS 的省电策略延迟。
 */
public class NotificationScheduler {
    private static final String TAG = "EarthOnline";
    private static final String PREFS_NAME = "earth_online_alarms";
    private static final String PREFIX_ID = "alarm_";

    /**
     * 调度一个通知闹钟。
     * @param context    应用上下文
     * @param noteId     笔记 ID（用于回调时识别）
     * @param title      通知标题
     * @param body       通知内容
     * @param timestamp  触发时间（毫秒时间戳）
     */
    public static void schedule(Context context, String noteId, String title, String body, long timestamp) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) {
            Log.e(TAG, "AlarmManager not available");
            return;
        }

        // 保存通知数据到 SharedPreferences（广播接收器触发时读取）
        saveAlarmData(context, noteId, title, body, timestamp);

        // 创建 Intent（指向 AlarmReceiver）
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction("com.earthonline.app.ALARM_TRIGGERED");
        intent.putExtra("noteId", noteId);
        intent.putExtra("title", title);
        intent.putExtra("body", body);

        int requestCode = hashId(noteId);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 使用 setAlarmClock() — 最高优先级，不可被系统延迟
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            AlarmManager.AlarmClockInfo alarmClock = new AlarmManager.AlarmClockInfo(
                    timestamp,
                    PendingIntent.getActivity(
                            context,
                            0,
                            new Intent(context, MainActivity.class),
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    )
            );
            am.setAlarmClock(alarmClock, pendingIntent);
        } else {
            am.setExact(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
        }

        String timeStr = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
                .format(new Date(timestamp));
        Log.d(TAG, "Alarm scheduled: " + noteId + " at " + timeStr);
    }

    /**
     * 取消一个已调度的闹钟。
     */
    public static void cancel(Context context, String noteId) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        int requestCode = hashId(noteId);
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction("com.earthonline.app.ALARM_TRIGGERED");
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        am.cancel(pendingIntent);
        pendingIntent.cancel();

        // 清除保存的数据
        removeAlarmData(context, noteId);

        Log.d(TAG, "Alarm cancelled: " + noteId);
    }

    /**
     * 取消所有已调度的闹钟（用于清除全部数据时）。
     */
    public static void cancelAll(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        Map<String, ?> all = prefs.getAll();
        for (String key : all.keySet()) {
            if (key.startsWith(PREFIX_ID)) {
                String noteId = key.substring(PREFIX_ID.length());
                cancel(context, noteId);
            }
        }
    }

    /**
     * 重新调度所有已保存的闹钟（系统重启后调用）。
     */
    public static void restoreAll(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        Map<String, ?> all = prefs.getAll();
        long now = System.currentTimeMillis();
        int restored = 0;

        for (Map.Entry<String, ?> entry : all.entrySet()) {
            String key = entry.getKey();
            if (!key.startsWith(PREFIX_ID)) continue;

            String noteId = key.substring(PREFIX_ID.length());
            String data = (String) entry.getValue();
            if (data == null) continue;

            try {
                String[] parts = data.split("\\|", 4);
                long timestamp = Long.parseLong(parts[0]);
                if (timestamp <= now) continue; // 已过期

                String title = parts.length > 1 ? parts[1] : "地球Online";
                String body = parts.length > 2 ? parts[2] : "";
                schedule(context, noteId, title, body, timestamp);
                restored++;
            } catch (Exception e) {
                Log.w(TAG, "Failed to restore alarm: " + noteId, e);
            }
        }

        if (restored > 0) {
            Log.d(TAG, "Restored " + restored + " alarms after reboot");
        }
    }

    // ===== SharedPreferences 存储 =====

    private static void saveAlarmData(Context context, String noteId, String title, String body, long timestamp) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        // 格式：timestamp|title|body
        String data = timestamp + "|" + (title != null ? title : "") + "|" + (body != null ? body : "");
        prefs.edit().putString(PREFIX_ID + noteId, data).apply();
    }

    private static void removeAlarmData(Context context, String noteId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove(PREFIX_ID + noteId).apply();
    }

    private static int hashId(String str) {
        if (str == null) return 0;
        int h = 0;
        for (int i = 0; i < str.length(); i++) {
            h = ((h << 5) - h) + str.charAt(i);
            h |= 0;
        }
        return Math.abs(h) % 2147483647;
    }
}
