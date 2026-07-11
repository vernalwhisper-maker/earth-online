// AI 对话与摘要 API 工具

const API_CONFIG = {
  deepseek: { endpoint: "https://api.deepseek.com/v1/chat/completions", model: "deepseek-chat" },
  zhipu: { endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions", model: "glm-4v-flash" },
  qwen: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", model: "qwen-vl-plus" },
};

// 可执行工具定义
export const AI_TOOLS = {
  moveNoteToFolder: {
    name: "moveNoteToFolder",
    description: "将笔记移动到指定文件夹",
    params: { noteTitle: "笔记标题（支持模糊匹配）", folderId: "目标文件夹ID（inbox/personal/work/study/archive 或自定义文件夹ID）" },
  },
  addTag: {
    name: "addTag",
    description: "给笔记添加标签",
    params: { noteTitle: "笔记标题", tag: "要添加的标签名" },
  },
  removeTag: {
    name: "removeTag",
    description: "移除笔记的某个标签",
    params: { noteTitle: "笔记标题", tag: "要移除的标签名" },
  },
  setNoteType: {
    name: "setNoteType",
    description: "更改笔记类型",
    params: { noteTitle: "笔记标题", noteType: "journal/todo/milestone/flashcard" },
  },
  setPinned: {
    name: "setPinned",
    description: "置顶或取消置顶笔记",
    params: { noteTitle: "笔记标题", pinned: true },
  },
  deleteNote: {
    name: "deleteNote",
    description: "删除笔记（移至回收站）",
    params: { noteTitle: "笔记标题" },
  },
};

const TOOLS_DESC = Object.values(AI_TOOLS).map((t) => {
  const paramsStr = Object.entries(t.params).map(([k, v]) => "    - " + k + ": " + v).join("\n");
  return "- " + t.name + "：" + t.description + "\n  参数：\n" + paramsStr;
}).join("\n\n");

const SYSTEM_PROMPT = [
  "你是地球Online的AI助手。你拥有分析用户笔记数据的能力（系统会在每次对话时提供笔记摘要JSON）。",
  "",
  "## 应用简介",
  "地球Online是一个游戏化的人生笔记与成就系统。",
  "",
  "## 笔记类型",
  "- journal（日志）：日常记录",
  "- todo（待办）：待办清单事项",
  "- milestone（里程碑）：人生重要时刻",
  "- flashcard（卡片）：灵感闪现",
  "",
  "## 你的分析能力",
  "基于笔记数据直接分析：按类型/文件夹/标签统计、情绪趋势、待办完成情况、成就建议、分类优化等",
  "",
  "## 可执行工具",
  "你可以在回复末尾附加【ACTION】JSON 来执行操作。支持以下工具：",
  "",
  TOOLS_DESC,
  "",
  "使用示例：在回复末尾添加",
  "【ACTION】[{\\\"action\\\":\\\"moveNoteToFolder\\\",\\\"params\\\":{\\\"noteTitle\\\":\\\"xxx\\\",\\\"folderId\\\":\\\"study\\\"}}]",
  "",
  "多个操作可放同一个数组里。不要单独输出【ACTION】而不给任何解释，先给用户解释方案，再附加操作。",
  "",
  "回答要求：",
  "- 温暖友善的语气",
  "- 可使用Markdown格式",
  "- 直接基于数据回答，不要说'请提供笔记内容'",
].join("\n");

// 生成笔记摘要
export async function generateSummary(noteContent, apiKey, provider, inference) {
  if (!apiKey) return null;
  const config = API_CONFIG[provider || "deepseek"];
  if (!config) return null;
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: "用一句话（不超过30字）概括用户笔记的核心内容。直接输出摘要。" },
          { role: "user", content: noteContent },
        ],
        temperature: 0.1, max_tokens: 100,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("Summary failed:", err);
    return null;
  }
}

// AI 对话
export async function chatWithAI(messages, apiKey, provider, inference) {
  if (!apiKey) return null;
  const config = API_CONFIG[provider || "deepseek"];
  if (!config) return null;
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: inference?.temperature || 0.7,
        max_tokens: inference?.maxTokens || 800,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error("AI chat failed:", err);
    return null;
  }
}
