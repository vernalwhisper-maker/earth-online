package com.earthonline.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 注册自定义原生插件
        registerPlugin(EarthOnlinePlugin.class);

        // 在 Capacitor WebView 加载前创建通知频道
        // 这对 HyperOS / MIUI 设备至关重要：频道必须在首次调度通知前存在
        NotificationHelper.createNotificationChannels(this);

        // 恢复系统重启前已调度的闹钟（以防 BootReceiver 未及时触发）
        NotificationScheduler.restoreAll(this);
    }
}
