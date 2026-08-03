package com.earthonline.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 注册导出到系统 Download 的原生插件
        registerPlugin(DownloadPlugin.class);
    }
}
