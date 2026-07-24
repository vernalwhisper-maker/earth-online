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
  /** 批量解锁队列（用于依次弹出） */
  unlockQueue: [],
  /** 当前在队列中的索引 */
  unlockIndex: 0,

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

  /**
   * 批量解锁成就。
   * < 5 个：放入 unlockQueue 逐个弹出；
   * >= 5 个：直接设置 lastUnlockedBatch 展示批量页面。
   */
  batchUnlock(ids, noteId) {
    const state = get();
    const now = new Date().toISOString();
    const newMap = { ...state.unlockedMap };
    let changed = false;
    const newlyUnlocked = [];

    for (const id of ids) {
      if (newMap[id]) continue;
      newMap[id] = { unlocked_at: now, triggered_by: [noteId] };
      newlyUnlocked.push(id);
      changed = true;
    }
    if (!changed) return;

    saveUnlocked(newMap);
    const updated = state.achievements.map((a) => {
      if (newlyUnlocked.includes(a.id)) {
        return { ...a, unlocked: true, unlocked_at: now, triggered_by: [noteId] };
      }
      return a;
    });

    const unlockObjs = updated.filter((a) => newlyUnlocked.includes(a.id));

    if (newlyUnlocked.length < 5) {
      // 逐个弹出
      set({
        achievements: updated,
        unlockedMap: newMap,
        unlockQueue: unlockObjs,
        unlockIndex: 0,
        lastUnlocked: unlockObjs[0] || null,
        lastUnlockedBatch: null,
      });
    } else {
      // 批量页面展示
      set({
        achievements: updated,
        unlockedMap: newMap,
        unlockQueue: [],
        unlockIndex: 0,
        lastUnlocked: null,
        lastUnlockedBatch: unlockObjs,
      });
    }
  },

  /** 关闭当前成就弹窗，如果队列中还有下一个则展示下一个 */
  dismissUnlock() {
    const state = get();
    const { unlockQueue, unlockIndex } = state;
    if (unlockQueue.length > 0 && unlockIndex + 1 < unlockQueue.length) {
      const nextIdx = unlockIndex + 1;
      set({ lastUnlocked: unlockQueue[nextIdx], unlockIndex: nextIdx });
    } else {
      set({ lastUnlocked: null, unlockQueue: [], unlockIndex: 0, lastUnlockedBatch: null });
    }
  },

  dismissLastUnlocked() { this.dismissUnlock(); },

  dismissBatch() { set({ lastUnlockedBatch: null }); },

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
