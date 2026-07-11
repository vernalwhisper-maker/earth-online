package com.earthonline.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * 闹钟广播接收器。
 * 当 AlarmManager.setAlarmClock() 触发的闹钟到期时，
 * 直接从原生代码发出通知，不依赖 JS 桥接。
 */
public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "EarthOnline";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!"com.earthonline.app.ALARM_TRIGGERED".equals(intent.getAction())) {
            return;
        }

        String noteId = intent.getStringExtra("noteId");
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");

        Log.d(TAG, "Alarm triggered: " + noteId + " - " + title);

        // 构建点击通知后打开应用的 PendingIntent
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
                context,
                0,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 构建通知
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, NotificationHelper.CHANNEL_REMINDERS)
                .setSmallIcon(com.earthonline.app.R.drawable.ic_stat_note)
                .setContentTitle(title != null ? title : "地球Online")
                .setContentText(body != null ? body : "你有笔记待查看")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setContentIntent(contentIntent)
                .setDefaults(NotificationCompat.DEFAULT_ALL);

        // 显示通知
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                int notificationId = hashId(noteId);
                nm.notify(notificationId, builder.build());
                Log.d(TAG, "Notification shown: " + notificationId);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to show notification", e);
        }
    }

    private int hashId(String str) {
        if (str == null) return 0;
        int h = 0;
        for (int i = 0; i < str.length(); i++) {
            h = ((h << 5) - h) + str.charAt(i);
            h |= 0;
        }
        return Math.abs(h) % 2147483647;
    }
}
