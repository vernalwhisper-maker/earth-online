import { create } from "zustand";

let toastId = 0;

const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: (message, type = "info", duration = 3000) => {
    const id = ++toastId;
    const toast = { id, message, type, duration };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration);
    }
    return id;
  },

  success: (msg, duration) => get().addToast(msg, "success", duration),
  error: (msg, duration) => get().addToast(msg, "error", duration || 4000),
  info: (msg, duration) => get().addToast(msg, "info", duration),

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clearAll: () => set({ toasts: [] }),
}));

export default useToastStore;