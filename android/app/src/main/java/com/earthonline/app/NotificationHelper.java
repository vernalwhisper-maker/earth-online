package com.earthonline.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.util.Log;

public class NotificationHelper {
    private static final String TAG = "EarthOnline";

    // 通知频道ID — 必须与JS层 capacitor.config.json / notifications.js 一致
    public static final String CHANNEL_REMINDERS = "earth-online-reminders";

    /**
     * 创建所有通知频道。在应用启动时（MainActivity.onCreate）和
     * 系统重启后（BootReceiver.onReceive）调用。
     */
    public static void createNotificationChannels(Context context) {
        NotificationManager nm = context.getSystemService(NotificationManager.class);

        // 笔记提醒频道 — 高重要性，弹出通知
        NotificationChannel reminders = new NotificationChannel(
                CHANNEL_REMINDERS,
                "笔记提醒",
                NotificationManager.IMPORTANCE_HIGH
        );
        reminders.setDescription("地球Online 笔记提醒");
        reminders.enableVibration(true);
        reminders.setShowBadge(true);
        reminders.setLockscreenVisibility(NotificationManager.IMPORTANCE_HIGH);
        nm.createNotificationChannel(reminders);

        // 后台服务频道 — 用于前台服务
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel service = new NotificationChannel(
                    "earth-online-service",
                    "后台服务",
                    NotificationManager.IMPORTANCE_LOW
            );
            service.setDescription("地球Online 后台服务通知");
            service.setShowBadge(false);
            nm.createNotificationChannel(service);
        }

        Log.d(TAG, "Notification channels created");
    }
}
