package com.earthonline.app;

import android.content.Context;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 地球Online 原生功能桥接插件。
 * 提供 JS → 原生调用的能力，当前用于可靠的通知闹钟调度。
 *
 * JS 调用方式：
 *   import { registerPlugin } from '@capacitor/core';
 *   const EarthOnline = registerPlugin('EarthOnline');
 *   await EarthOnline.scheduleNotification({ id, title, body, at });
 */
@CapacitorPlugin(name = "EarthOnline")
public class EarthOnlinePlugin extends Plugin {

    @PluginMethod
    public void scheduleNotification(PluginCall call) {
        String id = call.getString("id");
        String title = call.getString("title", "地球Online");
        String body = call.getString("body", "");
        Double timestamp = call.getDouble("at"); // 毫秒时间戳

        if (id == null || timestamp == null || timestamp <= 0) {
            call.reject("Missing required parameters: id, at");
            return;
        }

        Context context = getContext();
        NotificationScheduler.schedule(
                context,
                id,
                title,
                body,
                timestamp.longValue()
        );

        call.resolve();
    }

    @PluginMethod
    public void cancelNotification(PluginCall call) {
        String id = call.getString("id");
        if (id == null) {
            call.reject("Missing required parameter: id");
            return;
        }

        Context context = getContext();
        NotificationScheduler.cancel(context, id);

        call.resolve();
    }

    @PluginMethod
    public void cancelAllNotifications(PluginCall call) {
        Context context = getContext();
        NotificationScheduler.cancelAll(context);
        call.resolve();
    }
}
