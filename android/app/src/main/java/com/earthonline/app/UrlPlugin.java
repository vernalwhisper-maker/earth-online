package com.earthonline.app;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 链接工具原生插件。
 * - openUrl：在系统浏览器中打开外部链接（Intent.ACTION_VIEW，无需任何权限）
 * - copyText：复制文本到系统剪贴板（ClipboardManager，无需任何权限）
 */
@CapacitorPlugin(name = "UrlPlugin")
public class UrlPlugin extends Plugin {

    /** 在系统浏览器中打开外部链接 */
    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("url is required");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("open url failed: " + e.getMessage());
        }
    }

    /** 复制文本到系统剪贴板 */
    @PluginMethod
    public void copyText(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.isEmpty()) {
            call.reject("text is required");
            return;
        }
        try {
            ClipboardManager cm = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
            cm.setPrimaryClip(ClipData.newPlainText("EarthOnline", text));
            call.resolve();
        } catch (Exception e) {
            call.reject("copy failed: " + e.getMessage());
        }
    }
}
