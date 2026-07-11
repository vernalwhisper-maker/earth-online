// AI 成就匹配模块
// 双引擎策略：AI语义匹配 + 关键词兜底

import achievementsData from "../data/achievements";

const API_CONFIG = {
  deepseek: { endpoint: "https://api.deepseek.com/v1/chat/completions", model: "deepseek-chat", label: "DeepSeek V4 Flash" },
  zhipu: { endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions", model: "glm-4v-flash", label: "智谱 GLM-4V-Flash" },
  qwen: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", model: "qwen-vl-plus", label: "通义千问 Qwen-VL-Plus" },
};
// Extra keywords beyond the achievement name itself — kept minimal to stay DRY
// Achievement names are auto-included as keywords by buildKeywords()
const KEYWORD_EXTRAS = {
  1: ["买房", "购房", "房产", "全款", "置业", "无贷款", "产权"],
  2: ["守住", "坚持", "初心", "年少", "热爱"],
  3: ["财务自由", "收入", "富足", "赚钱", "经济独立"],
  4: ["游戏机", "主机", "Switch", "PS5", "Xbox", "电玩"],
  5: ["表白", "喜欢", "告白", "两情相悦", "恋爱"],
  6: ["自律", "早睡早起", "规律", "作息", "习惯"],
  7: ["钓鱼", "垂钓", "户外", "独处", "休闲"],
  8: ["落日", "夕阳", "日落", "美景", "拍照", "摄影"],
  9: ["平安", "安稳", "平安健康"],
  10: ["徒步", "长途", "旅行", "走路", "远足"],
  11: ["无债", "无贷款", "一身轻", "不欠"],
  12: ["语言", "外语", "英语", "日语", "方言"],
  13: ["露营", "帐篷", "野外", "户外", "过夜"],
  14: ["出国", "国外", "海外", "旅行", "签证"],
  15: ["乐器", "吉他", "钢琴", "小提琴", "古筝"],
  16: ["赴约", "见面", "奔赴", "千里"],
  17: ["热爱", "坚持", "爱好", "从未放弃"],
  18: ["挚友", "十年", "信任", "友谊"],
  19: ["熬夜", "不睡觉", "通宵", "24小时", "失眠"],
  20: ["方言", "家乡话", "语言", "粤语"],
  21: ["学习", "卷", "奋斗", "10小时", "努力", "内卷"],
  22: ["演唱会", "音乐节", "现场", "live", "听歌"],
  23: ["睡觉", "嗜睡", "睡眠"],
  24: ["旅行", "说走就走", "即兴", "出发"],
  25: ["手工", "DIY", "制作", "手作", "编织", "烘焙"],
  26: ["游戏", "1000小时", "资深", "玩家", "时长"],
  27: ["电影", "观影", "看片", "影评", "电影院"],
  28: ["经济独立", "不靠家里", "自力更生"],
  29: ["社交", "朋友少", "独处", "极简", "内向"],
  30: ["宠物", "猫", "狗", "陪伴", "养", "动物"],
  31: ["刷视频", "刷手机", "不间断", "上头", "沉迷"],
  32: ["孩子", "生子", "怀孕", "生娃", "育儿", "宝宝"],
  33: ["结婚", "婚姻", "伴侣", "配偶", "夫妻", "婚礼"],
  34: ["哭", "流泪", "感动", "催泪", "泪目"],
  35: ["自驾", "开车", "自驾游", "公路旅行"],
  36: ["睡眠少", "睡得少", "缺觉", "7小时", "夜猫子"],
  37: ["单身", "单身狗", "没谈过", "独身"],
  38: ["毕业", "大学", "学历", "文凭", "学业"],
  39: ["追剧", "电视剧", "剧集", "刷剧", "看剧"],
  40: ["独处", "一个人", "独自", "独居", "一人食"],
  41: ["异乡", "打工人", "背井离乡", "漂泊", "外地"],
  42: ["登山", "登顶", "爬山", "顶峰", "高山"],
  43: ["妈妈", "母亲", "礼物", "鲜花", "老妈"],
  44: ["驾照", "驾考", "学车", "考驾照", "驾驶证"],
  45: ["地铁", "公交", "公共交通", "通勤", "坐车"],
  46: ["想法多", "拖延", "迟迟不", "空想"],
  47: ["分手", "遗憾", "前任", "错过", "失恋"],
  48: ["做饭", "下厨", "做菜", "烹饪", "家常菜"],
  49: ["查资料", "搜索", "意外发现", "不知不觉"],
  50: ["低谷", "走出来", "自我调节", "自愈", "振作"],
  51: ["初恋", "第一次恋爱", "心动", "感情"],
  52: ["第一份工作", "入职", "全职", "正式工作", "上班"],
  53: ["满分", "考试", "第一名", "天才", "高分"],
  54: ["老朋友", "疏远", "走散", "淡出", "渐行渐远"],
  55: ["外卖", "点外卖", "不做饭", "外卖续命"],
  56: ["月光", "花光", "工资清零", "存不下钱"],
  57: ["远行", "离开家乡", "离家", "陌生城市"],
  58: ["拖延", "截止日期", "最后一天", "极限", "赶工"],
  59: ["通宵", "熬夜", "凌晨", "不睡", "深夜"],
  60: ["开始", "新生", "新生活", "起点", "人生", "欢迎", "第一次"],
};

// Build keyword mapping from canonical data to keep IDs in sync (DRY)
function buildKeywords() {
  const map = {};
  for (const a of achievementsData) {
    map[a.id] = [a.name, ...(KEYWORD_EXTRAS[a.id] || [])];
  }
  return map;
}

const ACHIEVEMENT_KEYWORDS = buildKeywords();

// Pre-filter keywords at module level (skip 2-char or fewer — too generic)
const KEYWORDS_FILTERED = Object.fromEntries(
  Object.entries(ACHIEVEMENT_KEYWORDS).map(([id, kws]) => [
    id,
    kws.filter((kw) => kw.length >= 3),
  ])
);

function keywordMatch(noteContent) {
  const text = noteContent.toLowerCase();
  const scores = {};
  for (const [id, validKws] of Object.entries(KEYWORDS_FILTERED)) {
    if (validKws.length === 0) continue;
    let matchCount = 0;
    for (const kw of validKws) {
      if (text.includes(kw.toLowerCase())) {
        matchCount++;
      }
    }
    // Require at least 2 distinct keyword matches, or 1 match with a long keyword (>=4 chars)
    if (matchCount >= 2) {
      scores[id] = matchCount;
    } else if (matchCount === 1) {
      for (const kw of validKws) {
        if (text.includes(kw.toLowerCase()) && kw.length >= 4) {
          scores[id] = 1;
          break;
        }
      }
    }
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map((e) => parseInt(e[0]));
}

const SYSTEM_PROMPT = [
  "你是一个精确的人生成就匹配专家。你的任务是将用户的笔记内容与成就列表进行匹配。",
  "匹配规则：",
  "1. 分析笔记中包含的关键事件、行为、状态和情感",
  "2. 与成就库中的每个成就逐一比对",
  "3. 只看语义相关度，忽略稀有度高低",
  "4. 只返回1-2个最匹配的成就",
  "5. 非常不相关就返回空数组 []",
  "6. 只输出JSON格式，不要带任何说明文字",
].join("\n");

const EXAMPLE = [
  "",
  "示例1：",
  "笔记：今天终于拿到驾照了，科目二考了两次，科目三一次过，开心！",
  "输出：[43]",
  "",
  "示例2：",
  "笔记：周末去爬了泰山，山顶的日出太美了，虽然累但是值得。",
  "输出：[42, 10]",
  "",
  "示例3：",
  "笔记：今天加班到凌晨两点，项目终于交付了",
  "输出：[59]",
  "",
  "示例4：",
  "笔记：领证了！从今天开始我们就是合法夫妻了",
  "输出：[33]",
  "",
  "示例5：",
  "笔记：路过花店给妈妈买了一束花",
  "输出：[44]",
  "",
  "示例6：",
  "笔记：一个人在这个城市打拼三年了，最大的感受就是学会了和自己相处",
  "输出：[40, 41]",
  "",
  "示例7：",
  "笔记：又刷了一晚上短视频，根本停不下来",
  "输出：[32]",
  "",
].join("\n");

// Generate achievement list from the canonical data source (DRY)
function buildAchievementList() {
  return achievementsData
    .map((a) => `${a.id}.${a.name}-${a.description}`)
    .join("\n");
}

const ACHIEVEMENT_LIST = buildAchievementList();

function parseIds(text) {
  // Only accept clean JSON arrays. Do NOT fall back to scanning
  // bare numbers — the AI prompt contains achievement list number
  // prefixes (e.g. "1.主角登场") that would cause false matches.
  try {
    const clean = text.trim();
    if (clean.startsWith("[") && clean.endsWith("]")) {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) return parsed.filter((id) => id >= 1 && id <= 60);
    }
  } catch (e) {
    // Not valid JSON — try regex fallback
  }
  try {
    const match = text.match(/\[([\d,\s]*)\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed.filter((id) => id >= 1 && id <= 60);
    }
  } catch (e) {
    // Still not parseable — return empty
  }
  return [];
}

export async function matchAchievements(noteContent, apiKey, provider, inference) {
  const keywordResults = keywordMatch(noteContent);
  if (!apiKey) return keywordResults;
  const config = API_CONFIG[provider || "zhipu"];
  if (!config) return keywordResults;

  const userPrompt = [
    "以下是成就列表（序号.成就名-简短描述）：",
    "",
    ACHIEVEMENT_LIST,
    "",
    EXAMPLE,
    "",
    "用户笔记：",
    noteContent,
    "",
    "请直接输出JSON数组，例如 [43] 或 [32, 10] 或 []：",
  ].join("\n");

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: Math.min(inference.temperature || 0, 0.3),
        max_tokens: Math.max(50, Math.min(inference.maxTokens || 100, 200)),
      }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("AI API error:", response.status, errText);
      return keywordResults;
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const aiIds = parseIds(text);
    const merged = [...new Set([...aiIds, ...keywordResults])].slice(0, 3);
    return merged;
  } catch (err) {
    console.error("AI matching error:", err);
    return keywordResults;
  }
}

export { keywordMatch };
