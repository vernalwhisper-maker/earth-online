import { create } from "zustand";
import { getAllFolders, saveFolder, deleteFolder } from "../db";
import { DEFAULT_FOLDERS } from "../data/noteTypes";

const useFolderStore = create((set, get) => ({
  folders: [],
  loading: false,

  loadFolders: async () => {
    set({ loading: true });
    let folders = await getAllFolders();
    // 如果没有自定义文件夹，用默认列表
    if (folders.length === 0) {
      folders = DEFAULT_FOLDERS.map((f, i) => ({
        id: f.id,
        label: f.label,
        icon: f.icon,
        sortOrder: i,
        isDefault: true,
        created_at: new Date().toISOString(),
      }));
      // 保存到 DB
      for (const f of folders) {
        await saveFolder(f);
      }
    }
    set({ folders, loading: false });
  },

  addFolder: async (label) => {
    const state = get();
    const maxOrder = state.folders.reduce((max, f) => Math.max(max, f.sortOrder || 0), 0);
    const folder = {
      id: "folder-" + Date.now(),
      label,
      icon: "Folder",
      sortOrder: maxOrder + 1,
      isDefault: false,
    };
    const saved = await saveFolder(folder);
    set({ folders: [...state.folders, saved] });
    return saved;
  },

  renameFolder: async (id, label) => {
    const state = get();
    const folder = state.folders.find((f) => f.id === id);
    if (!folder) return;
    folder.label = label;
    const saved = await saveFolder(folder);
    set({ folders: state.folders.map((f) => (f.id === id ? saved : f)) });
  },

  removeFolder: async (id) => {
    await deleteFolder(id);
    set((state) => ({ folders: state.folders.filter((f) => f.id !== id) }));
  },
}));

export default useFolderStore;
