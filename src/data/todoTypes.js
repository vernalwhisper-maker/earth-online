// Todo 待办数据模型 — 参考小米澎湃笔记 todo.proto
// TodoEntity: content, remindType, expiredTime, remindTime, isFinish,
//   priority, category, colorLabel, listType, audioFileName, 等

export const TODO_PRIORITIES = {
  none: { key: "none", label: "无", color: "text-faded-slate", dot: "bg-faded-slate" },
  low: { key: "low", label: "低", color: "text-blue-500", dot: "bg-blue-500" },
  medium: { key: "medium", label: "中", color: "text-amber-500", dot: "bg-amber-500" },
  high: { key: "high", label: "高", color: "text-rose-500", dot: "bg-rose-500" },
};

export const TODO_PRIORITY_KEYS = Object.keys(TODO_PRIORITIES);
export const DEFAULT_PRIORITY = "none";

// 颜色标签 — 参考小米 colorLabel
export const TODO_COLORS = [
  { id: 0, label: "默认", class: "" },
  { id: 1, label: "红", class: "bg-rose-500" },
  { id: 2, label: "橙", class: "bg-orange-500" },
  { id: 3, label: "黄", class: "bg-yellow-500" },
  { id: 4, label: "绿", class: "bg-emerald-500" },
  { id: 5, label: "蓝", class: "bg-blue-500" },
  { id: 6, label: "紫", class: "bg-violet-500" },
];

// 分类（category）
export const TODO_CATEGORIES = [
  { key: "none", label: "未分类" },
  { key: "personal", label: "个人" },
  { key: "work", label: "工作" },
  { key: "study", label: "学习" },
  { key: "health", label: "健康" },
  { key: "finance", label: "财务" },
  { key: "social", label: "社交" },
];

// 重复类型 — 参考小米 remindRepeatType
export const TODO_REPEAT_TYPES = [
  { key: "none", label: "不重复" },
  { key: "daily", label: "每天" },
  { key: "weekdays", label: "工作日" },
  { key: "weekly", label: "每周" },
  { key: "monthly", label: "每月" },
  { key: "yearly", label: "每年" },
];

// 清单类型 — 参考小米 listType
export const TODO_LIST_TYPES = [
  { key: "default", label: "标准" },
  { key: "shopping", label: "购物" },
  { key: "packing", label: "打包" },
  { key: "habit", label: "习惯" },
];

// 默认 TodoItem
export function createDefaultTodoItem(overrides = {}) {
  return {
    id: undefined,            // 由 DB 生成
    noteId: null,             // 关联的笔记 ID
    content: "",
    isCompleted: false,
    completedAt: null,
    priority: DEFAULT_PRIORITY,
    dueDate: null,            // 到期日期 (ISO string)
    remindDate: null,         // 提醒时间
    remindType: 0,            // 0=无提醒, 1=到期提醒, 2=提前
    remindRepeatType: "none",
    category: "none",
    colorLabel: 0,
    sortOrder: 0,
    inputType: 0,             // 0=文字, 1=语音
    audioFileName: null,
    tags: [],
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}