package com.earthonline.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * 系统启动完成后重新创建通知频道。
 * 在 Android 8.0+ 上，通知频道在应用安装时创建，但系统重启后
 * 某些 ROM（如 HyperOS）可能丢失频道配置，需要重新创建。
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "EarthOnline";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.d(TAG, "Boot completed — recreating notification channels and restoring alarms");

            // 重建通知频道（某些 ROM 重启后丢失频道配置）
            NotificationHelper.createNotificationChannels(context);

            // 恢复所有已调度的闹钟
            NotificationScheduler.restoreAll(context);
        }
    }
}
