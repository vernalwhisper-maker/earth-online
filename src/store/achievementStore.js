import { create } from "zustand";
import achievementsData from "../data/achievements";

const STORAGE_KEY = "earth-online-achievements";

function loadUnlocked() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveUnlocked(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Silently ignore storage errors
  }
}

const useAchievementStore = create((set, get) => ({
  achievements: achievementsData.map((a) => ({
    ...a, unlocked: false, unlocked_at: null, triggered_by: [],
  })),
  unlockedMap: {},
  lastUnlocked: null,

  loadState() {
    const unlockedMap = loadUnlocked();
    const achievements = achievementsData.map((a) => ({
      ...a,
      unlocked: !!unlockedMap[a.id],
      unlocked_at: unlockedMap[a.id]?.unlocked_at || null,
      triggered_by: unlockedMap[a.id]?.triggered_by || [],
    }));
    set({ achievements, unlockedMap });
  },

  unlockAchievement(id, noteId) {
    const state = get();
    if (state.unlockedMap[id]) return null;
    const now = new Date().toISOString();
    const entry = { unlocked_at: now, triggered_by: [noteId] };
    const newMap = { ...state.unlockedMap, [id]: entry };
    saveUnlocked(newMap);
    const updated = state.achievements.map((a) =>
      a.id === id ? { ...a, unlocked: true, unlocked_at: now, triggered_by: [noteId] } : a
    );
    const achievement = updated.find((a) => a.id === id);
    set({ achievements: updated, unlockedMap: newMap, lastUnlocked: achievement });
    return achievement;
  },

  dismissLastUnlocked() { set({ lastUnlocked: null }); },

  getUnlockedCount() {
    return Object.keys(get().unlockedMap).length;
  },

  getSortedAchievements(filter = "全部", sortBy = "default") {
    const achievements = get().achievements;
    let filtered;
    if (filter === "已解锁") filtered = achievements.filter((a) => a.unlocked);
    else if (filter === "未解锁") filtered = achievements.filter((a) => !a.unlocked);
    else filtered = achievements;
    const sorted = [...filtered];
    if (sortBy === "rarity") {
      sorted.sort((a, b) => a.rarity - b.rarity);
    } else {
      sorted.sort((a, b) => a.id - b.id);
    }
    return sorted;
  },
}));

export default useAchievementStore;
