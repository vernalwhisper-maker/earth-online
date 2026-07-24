// 语音转文字工具

/**
 * 使用浏览器 Web Speech API 进行实时语音识别。
 * 返回一个控制对象 { start, stop, isSupported }。
 */
export function createSpeechRecognizer({ onResult, onError, language = "zh-CN" }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return {
      isSupported: false,
      start: () => onError?.("浏览器不支持语音识别"),
      stop: () => {},
    };
  }

  const recognition = new SpeechRecognition();
  recognition.lang = language;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let final = "";
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }
    onResult?.({ final, interim });
  };

  recognition.onerror = (event) => {
    onError?.(event.error || "语音识别错误");
  };

  return {
    isSupported: true,
    start: () => {
      try { recognition.start(); } catch { /* already started */ }
    },
    stop: () => {
      try { recognition.stop(); } catch { /* not running */ }
    },
    abort: () => {
      try { recognition.abort(); } catch { /* not running */ }
    },
  };
}

/**
 * 使用 AI API 对音频文件进行转文字（Whisper 兼容接口）。
 * 目前适配兼容 OpenAI Whisper API 格式的端点。
 */
export async function transcribeAudio(audioBase64, apiKey, endpoint) {
  // 从 base64 中提取音频数据
  const match = audioBase64.match(/^data:audio\/([^;]+);base64,(.+)$/);
  if (!match) throw new Error("不支持的音频格式");

  const format = match[1];
  const audioData = match[2];

  // 将 base64 转为 Blob
  const byteCharacters = atob(audioData);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: `audio/${format}` });

  const formData = new FormData();
  formData.append("file", blob, `audio.${format}`);
  formData.append("model", "whisper-1");
  formData.append("language", "zh");

  const response = await fetch(endpoint || "https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`转写失败: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.text || "";
}

/**
 * 使用 AI API 对文本生成摘要/总结。
 */
export async function summarizeText(text, apiKey, endpoint, model) {
  const response = await fetch(endpoint || "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "你是一个笔记总结助手。请用简洁的语言总结以下笔记的核心内容，不超过100字。" },
        { role: "user", content: text },
      ],
      temperature: 0.3,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`总结失败: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
