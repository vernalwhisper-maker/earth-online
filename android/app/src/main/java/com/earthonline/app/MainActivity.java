package com.earthonline.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 注册导出到系统 Download 的原生插件
        registerPlugin(DownloadPlugin.class);
        // 注册链接工具插件（浏览器打开 / 剪贴板复制）
        registerPlugin(UrlPlugin.class);
        // 注册语音识别插件（APP 端实时听写）
        registerPlugin(SpeechPlugin.class);
    }
}
