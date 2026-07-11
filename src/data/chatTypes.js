// AI 对话消息模型 — 参考小米澎湃笔记 ChatItemProto / ConversationMessageProto

export function createChatMessage(overrides = {}) {
  return {
    id: undefined,
    noteId: null,        // 关联笔记
    role: "user",        // "user" | "assistant" | "system"
    content: "",
    type: "text",        // "text" | "summary" | "suggestion"
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}
