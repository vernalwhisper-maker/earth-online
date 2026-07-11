// 笔记类型 — 参考小米澎湃笔记 noteType 字段（main/todo/summary/mindmap/outline/flashcard/dialogue_blog/schedule）
// 地球Online 结合自身场景做了适配

export const NOTE_TYPES = {
  journal: {
    key: "journal",
    label: "日志",
    icon: "FileText",
    description: "日常记录、心得感悟",
    color: "bg-emerald",
    textColor: "text-emerald",
  },
  todo: {
    key: "todo",
    label: "待办",
    icon: "CheckSquare",
    description: "待办清单事项",
    color: "bg-blue-500",
    textColor: "text-blue-500",
  },
  milestone: {
    key: "milestone",
    label: "里程碑",
    icon: "Award",
    description: "人生重要时刻与节点",
    color: "bg-amber-500",
    textColor: "text-amber-500",
  },
  flashcard: {
    key: "flashcard",
    label: "卡片",
    icon: "StickyNote",
    description: "灵感闪现、快速记忆",
    color: "bg-violet-500",
    textColor: "text-violet-500",
  },
};

export const NOTE_TYPE_KEYS = Object.keys(NOTE_TYPES);
export const DEFAULT_NOTE_TYPE = "journal";

// 背景颜色主题 — 参考小米 bgColorId
export const BG_COLORS = [
  { id: 0, label: "默认", class: "bg-surface", border: "border-scribe" },
  { id: 1, label: "暖阳", class: "bg-amber-50", border: "border-amber-200" },
  { id: 2, label: "薄荷", class: "bg-emerald-50", border: "border-emerald-200" },
  { id: 3, label: "天空", class: "bg-sky-50", border: "border-sky-200" },
  { id: 4, label: "薰衣草", class: "bg-purple-50", border: "border-purple-200" },
  { id: 5, label: "玫瑰", class: "bg-rose-50", border: "border-rose-200" },
  { id: 6, label: "深夜", class: "bg-gray-900 text-white", border: "border-gray-700" },
];

export const DEFAULT_BG_COLOR_ID = 0;

// 默认文件夹
export const DEFAULT_FOLDERS = [
  { id: "inbox", label: "收件箱", icon: "Inbox" },
  { id: "personal", label: "个人", icon: "User" },
  { id: "work", label: "工作", icon: "Briefcase" },
  { id: "study", label: "学习", icon: "BookOpen" },
  { id: "archive", label: "归档", icon: "Archive" },
];

// 新 Note 数据模型的默认值（参考小米 NoteEntity）
export function createDefaultNote(overrides = {}) {
  return {
    id: undefined,        // 由 DB 自动生成 UUID
    title: "",
    body: "",
    noteType: DEFAULT_NOTE_TYPE,
    tags: [],
    isPinned: false,
    bgColorId: DEFAULT_BG_COLOR_ID,
    bgPattern: "solid",
    animTheme: "none",
    isPrivate: false,
    parentId: null,
    reminderDate: null,
    images: [],
    contentMarkdown: null,
    snippet: "",
    folderId: "inbox",
    deletedAt: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}
