import { create } from "zustand";
import {
  getTodosByNoteId, getAllTodos, saveTodoItem,
  deleteTodoItem, toggleTodoItem, getActiveTodos,
} from "../db";

const useTodoStore = create((set, get) => ({
  items: [],
  byNoteId: {},
  activeCount: 0,
  overdueCount: 0,
  loading: false,

  loadAll: async () => {
    set({ loading: true });
    const items = await getAllTodos();
    const active = items.filter((i) => !i.isCompleted);
    const now = new Date();
    const overdue = active.filter((i) => i.dueDate && new Date(i.dueDate) < now);

    // 按 noteId 分组
    const byNoteId = {};
    for (const item of items) {
      if (!byNoteId[item.noteId]) byNoteId[item.noteId] = [];
      byNoteId[item.noteId].push(item);
    }

    set({
      items,
      byNoteId,
      activeCount: active.length,
      overdueCount: overdue.length,
      loading: false,
    });
  },

  loadByNoteId: async (noteId) => {
    const items = await getTodosByNoteId(noteId);
    set((state) => ({
      byNoteId: { ...state.byNoteId, [noteId]: items },
    }));
    return items;
  },

  getByNoteId: (noteId) => {
    return get().byNoteId[noteId] || [];
  },

  addItem: async (item) => {
    const saved = await saveTodoItem(item);
    const state = get();
    const list = state.byNoteId[saved.noteId] || [];
    set({
      byNoteId: { ...state.byNoteId, [saved.noteId]: [...list, saved] },
      items: [...state.items, saved],
      activeCount: saved.isCompleted ? state.activeCount : state.activeCount + 1,
    });
    return saved;
  },

  updateItem: async (item) => {
    const saved = await saveTodoItem(item);
    const state = get();
    // 更新 byNoteId
    const list = (state.byNoteId[saved.noteId] || []).map((i) =>
      i.id === saved.id ? saved : i
    );
    // 更新 items
    const items = state.items.map((i) => (i.id === saved.id ? saved : i));
    const active = items.filter((i) => !i.isCompleted);
    set({ byNoteId: { ...state.byNoteId, [saved.noteId]: list }, items, activeCount: active.length });
    return saved;
  },

  toggleItem: async (id) => {
    const toggled = await toggleTodoItem(id);
    if (!toggled) return;
    const state = get();
    const list = (state.byNoteId[toggled.noteId] || []).map((i) =>
      i.id === toggled.id ? toggled : i
    );
    const items = state.items.map((i) => (i.id === toggled.id ? toggled : i));
    const active = items.filter((i) => !i.isCompleted);
    set({ byNoteId: { ...state.byNoteId, [toggled.noteId]: list }, items, activeCount: active.length });
  },

  removeItem: async (id) => {
    const state = get();
    const item = state.items.find((i) => i.id === id);
    await deleteTodoItem(id);
    if (item) {
      const list = (state.byNoteId[item.noteId] || []).filter((i) => i.id !== id);
      const items = state.items.filter((i) => i.id !== id);
      const active = items.filter((i) => !i.isCompleted);
      set({ byNoteId: { ...state.byNoteId, [item.noteId]: list }, items, activeCount: active.length });
    }
  },

  // 获取待办总数（含已完成，按 noteId 分组）
  getTodoStats: (noteId) => {
    const state = get();
    const list = state.byNoteId[noteId] || [];
    return { total: list.length, completed: list.filter((i) => i.isCompleted).length };
  },

  getCompletedByNoteId: (noteId) => {
    const state = get();
    const list = state.byNoteId[noteId] || [];
    return list.filter((i) => i.isCompleted);
  },

  getOverdueByNoteId: (noteId) => {
    const state = get();
    const list = state.byNoteId[noteId] || [];
    const now = new Date();
    return list.filter((i) => !i.isCompleted && i.dueDate && new Date(i.dueDate) < now);
  },
}));

export default useTodoStore;