import { create } from "zustand";

/**
 * 笔记编辑器的操作状态桥接 Store。
 * NoteEditorPage / HomePage 注册操作回调，TabBar 消费并渲染按钮。
 */
const useEditorActionsStore = create((set) => ({
  // ===== 编辑器操作 =====
  onSave: null,
  onSaveWithAI: null,
  onPinToggle: null,
  onDelete: null,
  onMetaToggle: null,
  isPinned: false,
  isExistingNote: false,
  isAIAnalyzing: false,
  bgColorId: 0,
  onChangeBgColor: null,   // (id: number) => void
  folderId: "inbox",
  onChangeFolder: null,     // (id: string) => void
  tags: [],
  onAddTag: null,    // (tag: string) => void
  onRemoveTag: null, // (tag: string) => void

  // ===== 选择模式操作 =====
  onBatchDelete: null,
  onBatchMove: null,
  onBatchTogglePin: null,
  onSelectAll: null,
  selectCount: 0,
  selectPinState: "none", // "none" | "all_pinned" | "mixed"

  /**
   * 注册编辑器操作回调（由 NoteEditorPage 调用）。
   */
  setEditorActions: (actions) =>
    set({
      onSave: actions.onSave || null,
      onSaveWithAI: actions.onSaveWithAI || null,
      onPinToggle: actions.onPinToggle || null,
      onDelete: actions.onDelete || null,
      onMetaToggle: actions.onMetaToggle || null,
      isPinned: !!actions.isPinned,
      isExistingNote: !!actions.isExistingNote,
      isAIAnalyzing: !!actions.isAIAnalyzing,
      bgColorId: actions.bgColorId ?? 0,
      onChangeBgColor: actions.onChangeBgColor || null,
      folderId: actions.folderId || "inbox",
      onChangeFolder: actions.onChangeFolder || null,
      tags: actions.tags || [],
      onAddTag: actions.onAddTag || null,
      onRemoveTag: actions.onRemoveTag || null,
    }),

  /**
   * 注册选择模式操作（由 HomePage 调用）。
   */
  setSelectActions: (actions) =>
    set({
      onBatchDelete: actions.onBatchDelete || null,
      onBatchMove: actions.onBatchMove || null,
      onBatchTogglePin: actions.onBatchTogglePin || null,
      onSelectAll: actions.onSelectAll || null,
      selectCount: actions.selectCount || 0,
      selectPinState: actions.selectPinState || "none",
    }),

  /** 清除所有操作。 */
  clearActions: () =>
    set({
      onSave: null,
      onSaveWithAI: null,
      onPinToggle: null,
      onDelete: null,
      onMetaToggle: null,
      isPinned: false,
      isExistingNote: false,
      isAIAnalyzing: false,
      bgColorId: 0,
      onChangeBgColor: null,
      folderId: "inbox",
      onChangeFolder: null,
      tags: [],
      onAddTag: null,
      onRemoveTag: null,
      onBatchDelete: null,
      onBatchMove: null,
      onBatchTogglePin: null,
      onSelectAll: null,
      selectCount: 0,
      selectPinState: "none",
    }),
}));

export default useEditorActionsStore;
