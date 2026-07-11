import { create } from "zustand";
import { getAllNotes, saveNote, deleteNote, getNote, restoreNote, getDeletedNotes, permanentDeleteNote } from "../db";

const useNoteStore = create((set, get) => ({
  notes: [],
  deletedNotes: [],
  searchQuery: "",
  selectedTag: "全部",
  selectedType: null,
  selectedFolder: null,
  loading: false,
  tags: [],
  folders: [],

  loadNotes: async () => {
    set({ loading: true });
    const notes = await getAllNotes();
    const tags = [...new Set(notes.flatMap((n) => n.tags || []))];
    const folders = [...new Set(notes.map((n) => n.folderId).filter(Boolean))];
    set({ notes, tags, folders, loading: false });
  },

  loadDeletedNotes: async () => {
    const deletedNotes = await getDeletedNotes();
    set({ deletedNotes });
  },

  getNoteById: async (id) => {
    return getNote(id);
  },

  saveNote: async (note) => {
    const saved = await saveNote(note);
    const state = get();
    // 同时更新 notes 和 deletedNotes（如果是恢复的情况）
    let updated;
    const activeIdx = state.notes.findIndex((n) => n.id === saved.id);
    if (activeIdx >= 0) {
      updated = [...state.notes];
      updated[activeIdx] = saved;
    } else if (!saved.deletedAt) {
      updated = [saved, ...state.notes];
    } else {
      updated = state.notes;
    }
    updated.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
    const tags = [...new Set(updated.flatMap((n) => n.tags || []))];
    const folders = [...new Set(updated.map((n) => n.folderId).filter(Boolean))];
    set({ notes: updated, tags, folders });
    return saved;
  },

  deleteNote: async (id) => {
    await deleteNote(id);
    const state = get();
    set({
      notes: state.notes.filter((n) => n.id !== id),
    });
    // 重新加载回收站列表
    get().loadDeletedNotes();
  },

  restoreNote: async (id) => {
    await restoreNote(id);
    // 重新加载活跃笔记和回收站
    await get().loadNotes();
    await get().loadDeletedNotes();
  },

  permanentDeleteNote: async (id) => {
    await permanentDeleteNote(id);
    const state = get();
    set({
      deletedNotes: state.deletedNotes.filter((n) => n.id !== id),
    });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedTag: (tag) => set({ selectedTag: tag }),

  setSelectedType: (typeKey) => set({ selectedType: typeKey }),

  setSelectedFolder: (folderId) => set({ selectedFolder: folderId }),

  getFilteredNotes: () => {
    const { notes, searchQuery, selectedTag, selectedType, selectedFolder } = get();
    let filtered = notes;

    // 搜索关键词过滤（全字段检索）
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((n) =>
        (n.title || "").toLowerCase().includes(q) ||
        (n.body || "").toLowerCase().includes(q) ||
        (n.snippet || "").toLowerCase().includes(q) ||
        (n.contentMarkdown || "").toLowerCase().includes(q) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    // 标签过滤
    if (selectedTag !== "全部") {
      if (selectedTag === "今天") {
        const today = new Date().toISOString().slice(0, 10);
        filtered = filtered.filter((n) => n.created_at?.startsWith(today));
      } else if (selectedTag === "本周") {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        filtered = filtered.filter((n) => new Date(n.created_at) >= weekStart);
      } else {
        filtered = filtered.filter((n) => (n.tags || []).includes(selectedTag));
      }
    }

    // 笔记类型过滤
    if (selectedType) {
      filtered = filtered.filter((n) => n.noteType === selectedType);
    }

    // 文件夹过滤
    if (selectedFolder) {
      filtered = filtered.filter((n) => n.folderId === selectedFolder);
    }

    return filtered;
  },

  getNotesByFolder: () => {
    const { notes } = get();
    const grouped = {};
    for (const note of notes) {
      const folder = note.folderId || "inbox";
      if (!grouped[folder]) grouped[folder] = [];
      grouped[folder].push(note);
    }
    return grouped;
  },
}));

export default useNoteStore;