// AI 对话与摘要 API 工具

const API_CONFIG = {
  deepseek: { endpoint: "https://api.deepseek.com/v1/chat/completions", model: "deepseek-chat" },
  zhipu: { endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions", model: "glm-4v-flash" },
  qwen: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", model: "qwen-vl-plus" },
  ollama: { endpoint: "http://localhost:11434/v1/chat/completions", model: "llama3" },
};

// 关键词标签兜底 — 无需 API Key，从笔记内容匹配关键词推荐标签
const COMMON_TAGS = {
  "AI": ["AI", "人工智能", "ChatGPT", "大模型", "机器学习", "深度学"],
  "教程": ["教程", "指南", "教学", "步骤", "方法", "入门"],
  "菜谱": ["菜谱", "食谱", "做法", "食材", "烹饪"],
  "学习": ["学习", "复习", "考试", "读书", "课程", "知识", "论文", "作业"],
  "工作": ["工作", "项目", "会议", "任务", "加班", "同事", "汇报", "面试"],
  "日记": ["日记", "心情", "感受", "今天", "日常"],
  "生活": ["生活", "日常", "周末", "家里", "睡觉", "起床"],
  "旅行": ["旅行", "旅游", "出发", "景点", "酒店", "机票", "自驾"],
  "健康": ["健康", "运动", "跑步", "健身", "锻炼", "饮食", "体检"],
  "阅读": ["阅读", "读书", "小说", "文章", "读后感"],
  "电影": ["电影", "好看", "剧情", "导演", "上映", "影院", "影评"],
  "音乐": ["音乐", "演唱会", "专辑", "歌手", "旋律"],
  "美食": ["美食", "餐厅", "好吃", "做饭", "外卖"],
  "技术": ["代码", "编程", "开发", "修复", "GitHub", "前端"],
  "社交": ["朋友", "聚会", "见面", "聊天", "一起", "社交"],
  "家庭": ["家人", "父母", "孩子", "老公", "回家", "团圆"],
  "购物": ["购物", "快递", "下单", "商店", "打折", "网购"],
  "财务": ["收入", "花费", "预算", "理财", "账单", "工资"],
  "游戏": ["游戏", "Switch", "PS5", "通关", "Steam"],
  "宠物": ["宠物", "猫咪", "狗狗"],
};

// 关键词标签匹配（兜底引擎）
export function keywordTagMatch(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const scores = [];
  for (const [tag, keywords] of Object.entries(COMMON_TAGS)) {
    let count = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) count++;
    }
    if (count >= 2) scores.push(tag);
  }
  return scores.slice(0, 3);
}

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
export async function chatWithAIStream(messages, apiKey, provider, inference, onChunk) {
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
        stream: true,
      }),
    });
    if (!response.ok) return null;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            if (delta) {
              fullText += delta;
              onChunk?.(fullText, delta);
            }
          } catch {}
        }
      }
    }
    return fullText;
  } catch (err) {
    console.error("AI streaming failed:", err);
    return null;
  }
}

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

// === 自动标签 ===

const TAGGING_SYSTEM_PROMPT = [
  "你是一个标签推荐专家。根据笔记内容推荐1-3个中文标签概括主题。",
  "规则：",
  "1. 标签要简洁、准确（2-4个字），例如 AI、教程、菜谱、日记、学习",
  "2. 尽量从「已有标签」中选择匹配的；如果没有合适的就自由创造新标签",
  "3. 必须返回JSON数组格式，例如[\"AI\",\"教程\"]",
  "4. 只输出数组，不要任何说明文字",
].join("\n");

// LRU 标签缓存（避免重复调用同一内容）
const tagCache = new Map();
const CACHE_MAX = 50;
function getTagCacheKey(content, existingTagStr) {
  let h = 0;
  const s = content + "|" + existingTagStr;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return h.toString();
}

// AI 批量标签生成
export async function generateTags(notesContent, apiKey, provider, existingTags) {
  if (!apiKey) return [];
  const config = API_CONFIG[provider || "deepseek"];
  if (!config) return [];

  // 缓存查找
  const existingTagStr = (existingTags || []).sort().join(",");
  const cacheKey = getTagCacheKey(notesContent.slice(0, 500), existingTagStr);
  const cached = tagCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: TAGGING_SYSTEM_PROMPT },
          { role: "user", content: "已有标签：" + (existingTagStr || "无") + "\n\n笔记内容：\n" + notesContent },
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn("Tag API error:", response.status, errText.slice(0, 200));
      return [];
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    // 尝试解析 JSON，支持 markdown code block 格式
    let tags = [];
    try {
      const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
      tags = JSON.parse(cleaned);
    } catch {
      const match = text.match(/\[([^\]]*)\]/);
      if (match) {
        try { tags = JSON.parse("[" + match[1] + "]"); } catch { tags = []; }
      }
    }
    if (!Array.isArray(tags)) tags = [];
    // 写入缓存
    if (tags.length > 0) {
      if (tagCache.size >= CACHE_MAX) tagCache.delete(tagCache.keys().next().value);
      tagCache.set(cacheKey, tags);
    }
    return tags;
  } catch (err) {
    console.error("Tag generation failed:", err);
    return [];
  }
}
