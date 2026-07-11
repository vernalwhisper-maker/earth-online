import { create } from "zustand";
import { getAllNotes, saveNote, deleteNote, getNote } from "../db";

const useNoteStore = create((set, get) => ({
  notes: [],
  searchQuery: "",
  selectedTag: "全部",
  loading: false,
  tags: [],

  loadNotes: async () => {
    set({ loading: true });
    const notes = await getAllNotes();
    const tags = [...new Set(notes.flatMap((n) => n.tags || []))];
    set({ notes, tags, loading: false });
  },

  getNoteById: async (id) => {
    return getNote(id);
  },

  saveNote: async (note) => {
    const saved = await saveNote(note);
    const { notes } = get();
    const idx = notes.findIndex((n) => n.id === saved.id);
    let updated;
    if (idx >= 0) {
      updated = [...notes];
      updated[idx] = saved;
    } else {
      updated = [saved, ...notes];
    }
    updated.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const tags = [...new Set(updated.flatMap((n) => n.tags || []))];
    set({ notes: updated, tags });
    return saved;
  },

  deleteNote: async (id) => {
    await deleteNote(id);
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    }));
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedTag: (tag) => set({ selectedTag: tag }),

  getFilteredNotes: () => {
    const { notes, searchQuery, selectedTag } = get();
    let filtered = notes;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          (n.title || "").toLowerCase().includes(q) ||
          (n.body || "").toLowerCase().includes(q)
      );
    }
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
    return filtered;
  },
}));

export default useNoteStore;
