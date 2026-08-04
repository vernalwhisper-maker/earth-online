package com.earthonline.app;

import android.content.ContentUris;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * 导出到系统 Download 目录的原生插件。
 *
 * - Android 10+（API 29+）：通过 MediaStore.Downloads 集合写入，
 *   无需存储权限、不触发系统 SAF/文件访问弹窗，文件出现在「下载/EarthOnline/」。
 * - Android 9 及以下：直接写公共 Download 目录（WRITE_EXTERNAL_STORAGE 已声明）。
 *
 * 相比 Capacitor Filesystem：
 * - Directory.Documents 在 Android 11+ 仅能访问 app 自建文件（用户不可见/易触发权限问题）
 * - Directory.ExternalStorage 在 Android 11+ 不可访问
 */
@CapacitorPlugin(name = "DownloadPlugin")
public class DownloadPlugin extends Plugin {

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String base64 = call.getString("data");
        String fileName = call.getString("fileName");
        if (base64 == null || fileName == null || fileName.isEmpty()) {
            call.reject("data and fileName are required");
            return;
        }
        // 净化文件名：拒绝路径分隔符，避免路径注入
        if (fileName.contains("/") || fileName.contains("\\") || fileName.contains("..")) {
            fileName = fileName.replaceAll("[/\\\\]", "_").replace("..", "_");
        }
        try {
            byte[] bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
            String subDir = "EarthOnline";
            String mime = guessMime(fileName);
            Uri uri;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+：MediaStore Downloads 集合（免权限、免 SAF）
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, mime);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + subDir);
                uri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) {
                    call.reject("Failed to create download entry");
                    return;
                }
                try (OutputStream os = getContext().getContentResolver().openOutputStream(uri)) {
                    if (os == null) {
                        call.reject("Failed to open output stream");
                        return;
                    }
                    os.write(bytes);
                }
            } else {
                // Android 9 及以下：直接写公共 Download 目录
                File dir = new File(
                        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                        subDir);
                if (!dir.exists() && !dir.mkdirs()) {
                    call.reject("Failed to create directory");
                    return;
                }
                File out = new File(dir, fileName);
                try (FileOutputStream fos = new FileOutputStream(out)) {
                    fos.write(bytes);
                }
                uri = Uri.fromFile(out);
            }

            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Save failed: " + e.getMessage());
        }
    }

    /**
     * 列出「下载」目录下的可导入文件（.eon/.md/.txt/.json，任意子目录）。
     * Android 10+：MediaStore Downloads 集合查询（免权限），不限定 EarthOnline 子目录——
     * 用户可能把文件放在 Download 根目录或其他位置，0.6.0 及系统文件选择器均支持任意位置。
     * 返回 [{ name, uri, size }]，按修改时间倒序。
     */
    @PluginMethod
    public void listDownloads(PluginCall call) {
        JSArray arr = new JSArray();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                String selection = "(DISPLAY_NAME LIKE ? OR DISPLAY_NAME LIKE ? OR DISPLAY_NAME LIKE ? OR DISPLAY_NAME LIKE ?)";
                String[] args = { "%.eon", "%.md", "%.txt", "%.json" };
                try (Cursor c = getContext().getContentResolver().query(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        new String[]{MediaStore.Downloads._ID, MediaStore.Downloads.DISPLAY_NAME, MediaStore.Downloads.SIZE},
                        selection, args,
                        MediaStore.Downloads.DATE_MODIFIED + " DESC")) {
                    if (c != null) {
                        while (c.moveToNext()) {
                            long id = c.getLong(c.getColumnIndexOrThrow(MediaStore.Downloads._ID));
                            String name = c.getString(c.getColumnIndexOrThrow(MediaStore.Downloads.DISPLAY_NAME));
                            long size = c.getLong(c.getColumnIndexOrThrow(MediaStore.Downloads.SIZE));
                            Uri uri = ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, id);
                            JSObject o = new JSObject();
                            o.put("name", name);
                            o.put("uri", uri.toString());
                            o.put("size", size);
                            arr.put(o);
                        }
                    }
                }
            } else {
                // Android 9 及以下：直接列 Download 根目录 + EarthOnline 子目录
                File base = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                addImportFiles(arr, base);
                addImportFiles(arr, new File(base, "EarthOnline"));
            }
        } catch (Exception e) {
            call.reject("List failed: " + e.getMessage());
            return;
        }
        JSObject ret = new JSObject();
        ret.put("files", arr);
        call.resolve(ret);
    }

    /** Android 9-：把目录下可导入文件加入列表 */
    private void addImportFiles(JSArray arr, File dir) {
        if (dir == null || !dir.exists()) return;
        File[] files = dir.listFiles();
        if (files == null) return;
        for (File f : files) {
            if (!f.isFile()) continue;
            String name = f.getName().toLowerCase();
            if (!name.endsWith(".eon") && !name.endsWith(".md") && !name.endsWith(".txt") && !name.endsWith(".json")) continue;
            JSObject o = new JSObject();
            o.put("name", f.getName());
            o.put("uri", Uri.fromFile(f).toString());
            o.put("size", f.length());
            arr.put(o);
        }
    }

    /**
     * 读取 Download/EarthOnline/ 下导出文件的 base64 内容（免 SAF 弹窗）。
     */
    @PluginMethod
    public void readDownloadFile(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) {
            call.reject("uri is required");
            return;
        }
        try {
            Uri uri = Uri.parse(uriStr);
            InputStream is;
            if ("file".equals(uri.getScheme())) {
                // Android 9 及以下：file:// 直接读（已声明 READ_EXTERNAL_STORAGE）
                is = new FileInputStream(new File(uri.getPath()));
            } else {
                is = getContext().getContentResolver().openInputStream(uri);
            }
            try (InputStream in = is) {
                if (in == null) {
                    call.reject("Cannot open file");
                    return;
                }
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) != -1) {
                    bos.write(buf, 0, n);
                }
                String b64 = android.util.Base64.encodeToString(bos.toByteArray(), android.util.Base64.NO_WRAP);
                JSObject ret = new JSObject();
                ret.put("data", b64);
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("Read failed: " + e.getMessage());
        }
    }

    private String guessMime(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".md")) return "text/markdown";
        if (lower.endsWith(".eon")) return "application/octet-stream";
        if (lower.endsWith(".txt")) return "text/plain";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }
}
