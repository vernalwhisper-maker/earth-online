package com.earthonline.app;

import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;

/**
 * 原生语音识别插件（Android SpeechRecognizer，连续识别中文）。
 * WebView 不支持 Web Speech API，APP 端通过本插件实时听写。
 * 事件（notifyListeners）：partial（中间结果）/ result（最终结果）/ error。
 * 需要 RECORD_AUDIO 权限（运行时向系统申请）。
 */
@CapacitorPlugin(name = "SpeechPlugin", permissions = {
    @Permission(strings = {"android.permission.RECORD_AUDIO"}, alias = "recordAudio")
})
public class SpeechPlugin extends Plugin {

    private SpeechRecognizer recognizer;
    private Intent recognizerIntent;
    private boolean stopped = true;

    /** 开始连续语音识别 */
    @PluginMethod
    public void start(PluginCall call) {
        if (!hasRequiredPermissions()) {
            requestPermissionForAlias("recordAudio", call, "permissionCallback");
            return;
        }
        doStart(call.getString("language", "zh-CN"));
        call.resolve();
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (hasRequiredPermissions()) {
            doStart(call.getString("language", "zh-CN"));
            call.resolve();
        } else {
            call.reject("麦克风权限被拒绝");
        }
    }

    private void doStart(String language) {
        destroyRecognizer();
        recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
        recognizerIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
        recognizer.setRecognitionListener(listener);
        stopped = false;
        startListening();
    }

    private void startListening() {
        if (stopped || recognizer == null) return;
        try {
            recognizer.startListening(recognizerIntent);
        } catch (Exception ignored) {
            // 已停止或识别器繁忙，忽略
        }
    }

    /** 停止识别并释放资源 */
    @PluginMethod
    public void stop(PluginCall call) {
        stopped = true;
        destroyRecognizer();
        call.resolve();
    }

    private void destroyRecognizer() {
        if (recognizer != null) {
            try { recognizer.stopListening(); } catch (Exception ignored) {}
            try { recognizer.cancel(); } catch (Exception ignored) {}
            recognizer.destroy();
            recognizer = null;
        }
    }

    private final RecognitionListener listener = new RecognitionListener() {
        @Override public void onReadyForSpeech(Bundle params) {}
        @Override public void onBeginningOfSpeech() {}
        @Override public void onRmsChanged(float rmsdB) {}
        @Override public void onBufferReceived(byte[] buffer) {}
        @Override public void onEndOfSpeech() {
            if (!stopped) startListening(); // 连续识别
        }
        @Override public void onError(int error) {
            if (stopped) return;
            notifyListeners("error", new JSObject().put("message", "语音识别错误：" + error));
            if (!stopped) startListening(); // 自动重试
        }
        @Override public void onResults(Bundle results) {
            ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            if (matches != null && !matches.isEmpty()) {
                notifyListeners("result", new JSObject().put("text", matches.get(0)).put("final", true));
            }
            if (!stopped) startListening();
        }
        @Override public void onPartialResults(Bundle partialResults) {
            ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            if (matches != null && !matches.isEmpty()) {
                notifyListeners("partial", new JSObject().put("text", matches.get(0)).put("final", false));
            }
        }
        @Override public void onEvent(int eventType, Bundle params) {}
    };

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        stopped = true;
        destroyRecognizer();
    }
}
