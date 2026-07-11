import { openDB } from "idb";
import { DEFAULT_NOTE_TYPE, DEFAULT_BG_COLOR_ID, createDefaultNote } from "../data/noteTypes";
import { createDefaultTodoItem } from "../data/todoTypes";

// UUID 生成，兼容非安全上下文（如局域网 IP 访问）
function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const DB_NAME = "earth-online";
const DB_VERSION = 5;

let dbPromise = null;

function openDatabase() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      try {
        // === v1: notes + settings ===
        if (!db.objectStoreNames.contains("notes")) {
          const store = db.createObjectStore("notes", { keyPath: "id" });
          store.createIndex("updated_at", "updated_at", { unique: false });
          store.createIndex("created_at", "created_at", { unique: false });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }

        // === v1→v2: 迁移新字段 ===
        if (oldVersion < 2) {
          const store = transaction.objectStore("notes");
          // 同步迁移：直接遍历所有记录
          const req = store.openCursor();
          req.onsuccess = function (e) {
            const cursor = e.target.result;
            if (!cursor) return;
            const note = cursor.value;
            let needsUpdate = false;

            if (!note.noteType) { note.noteType = DEFAULT_NOTE_TYPE; needsUpdate = true; }
            if (note.isPinned === undefined) { note.isPinned = false; needsUpdate = true; }
            if (note.bgColorId === undefined) { note.bgColorId = DEFAULT_BG_COLOR_ID; needsUpdate = true; }
            if (note.isPrivate === undefined) { note.isPrivate = false; needsUpdate = true; }
            if (note.parentId === undefined) { note.parentId = null; needsUpdate = true; }
            if (note.reminderDate === undefined) { note.reminderDate = null; needsUpdate = true; }
            if (!note.images) { note.images = []; needsUpdate = true; }
            if (note.contentMarkdown === undefined) { note.contentMarkdown = null; needsUpdate = true; }
            if (note.snippet === undefined) { note.snippet = (note.body || "").slice(0, 120); needsUpdate = true; }
            if (!note.folderId) { note.folderId = "inbox"; needsUpdate = true; }
            if (note.deletedAt === undefined) { note.deletedAt = null; needsUpdate = true; }

            if (needsUpdate) { cursor.update(note); }
            cursor.continue();
          };
        }

        // === v2→v3: 添加 todos 存储 ===
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains("todos")) {
            const store = db.createObjectStore("todos", { keyPath: "id" });
            store.createIndex("noteId", "noteId", { unique: false });
            store.createIndex("isCompleted", "isCompleted", { unique: false });
            store.createIndex("dueDate", "dueDate", { unique: false });
            store.createIndex("priority", "priority", { unique: false });
            store.createIndex("category", "category", { unique: false });
            store.createIndex("updated_at", "updated_at", { unique: false });
          }
        }
        // === v3→v4: 添加 folders 存储 + search_history 存储 ===
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains("folders")) {
            const store = db.createObjectStore("folders", { keyPath: "id" });
            store.createIndex("sortOrder", "sortOrder", { unique: false });
          }
          if (!db.objectStoreNames.contains("search_history")) {
            const store = db.createObjectStore("search_history", { keyPath: "id" });
            store.createIndex("timestamp", "timestamp", { unique: false });
          }
        }

        // === v4→v5: 添加 AI 对话存储 ===
        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains("chat_messages")) {
            const store = db.createObjectStore("chat_messages", { keyPath: "id" });
            store.createIndex("noteId", "noteId", { unique: false });
            store.createIndex("timestamp", "timestamp", { unique: false });
          }
        }      } catch (err) {
        console.error("DB upgrade failed:", err);
        throw err;
      }
    },
  });
}

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDatabase().catch((err) => {
      console.error("Failed to open database:", err);
      dbPromise = null; // 重置以便下次重试
      throw err;
    });
  }
  return dbPromise;
}

// ========== Notes ==========

export async function getAllNotes() {
  try {
    const db = await getDB();
    const notes = await db.getAll("notes");
    const active = notes.filter((n) => !n.deletedAt);
    active.sort((a, b) => {
      try {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      } catch { return 0; }
    });
    return active;
  } catch (err) {
    console.error("getAllNotes failed:", err);
    return [];
  }
}

export async function getDeletedNotes() {
  try {
    const db = await getDB();
    const notes = await db.getAll("notes");
    return notes.filter((n) => n.deletedAt)
      .sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));
  } catch (err) {
    console.error("getDeletedNotes failed:", err);
    return [];
  }
}

export async function getNote(id) {
  try {
    if (!id) throw new Error("getNote: id is required");
    const db = await getDB();
    return db.get("notes", id);
  } catch (err) {
    console.error("getNote failed:", err);
    return null;
  }
}

export async function saveNote(note) {
  try {
    if (!note) throw new Error("saveNote: note is required");
    const db = await getDB();
    const now = new Date().toISOString();

    // 填充默认值
    const defaults = createDefaultNote();
    for (const key of Object.keys(defaults)) {
      if (note[key] === undefined) { note[key] = defaults[key]; }
    }

    note.updated_at = now;
    if (!note.created_at) note.created_at = now;
    if (!note.id) note.id = generateId();
    note.snippet = note.snippet || (note.body || "").slice(0, 120);

    // 确保 images 是数组
    if (!Array.isArray(note.images)) note.images = [];
    if (!Array.isArray(note.tags)) note.tags = [];

    await db.put("notes", note);
    return note;
  } catch (err) {
    console.error("saveNote failed:", err);
    throw err;
  }
}

export async function deleteNote(id) {
  try {
    const db = await getDB();
    const note = await db.get("notes", id);
    if (note) {
      note.deletedAt = new Date().toISOString();
      await db.put("notes", note);
    }
  } catch (err) {
    console.error("deleteNote failed:", err);
    throw err;
  }
}

export async function permanentDeleteNote(id) {
  try {
    const db = await getDB();
    await db.delete("notes", id);
    // 清理关联的待办项
    const todos = await db.getAllFromIndex("todos", "noteId", id);
    const tx = db.transaction("todos", "readwrite");
    for (const todo of todos) {
      tx.store.delete(todo.id);
    }
    await tx.done;
  } catch (err) {
    console.error("permanentDeleteNote failed:", err);
  }
}

export async function restoreNote(id) {
  try {
    const db = await getDB();
    const note = await db.get("notes", id);
    if (note) {
      note.deletedAt = null;
      await db.put("notes", note);
    }
  } catch (err) {
    console.error("restoreNote failed:", err);
  }
}

// ========== Todos ==========

export async function getTodosByNoteId(noteId) {
  try {
    const db = await getDB();
    if (!db.objectStoreNames.contains("todos")) return [];
    const todos = await db.getAllFromIndex("todos", "noteId", noteId);
    todos.sort((a, b) => a.sortOrder - b.sortOrder || (a.created_at || "").localeCompare(b.created_at || ""));
    return todos;
  } catch (err) {
    console.error("getTodosByNoteId failed:", err);
    return [];
  }
}

export async function getAllTodos() {
  try {
    const db = await getDB();
    if (!db.objectStoreNames.contains("todos")) return [];
    return db.getAll("todos");
  } catch (err) {
    console.error("getAllTodos failed:", err);
    return [];
  }
}

export async function getActiveTodos() {
  try {
    const db = await getDB();
    if (!db.objectStoreNames.contains("todos")) return [];
    return db.getAllFromIndex("todos", "isCompleted", false);
  } catch (err) {
    return [];
  }
}

export async function saveTodoItem(item) {
  try {
    const db = await getDB();
    const now = new Date().toISOString();
    const defaults = createDefaultTodoItem();
    for (const key of Object.keys(defaults)) {
      if (item[key] === undefined) { item[key] = defaults[key]; }
    }
    item.updated_at = now;
    if (!item.created_at) item.created_at = now;
    if (!item.id) item.id = generateId();
    await db.put("todos", item);
    return item;
  } catch (err) {
    console.error("saveTodoItem failed:", err);
    throw err;
  }
}

export async function deleteTodoItem(id) {
  try {
    const db = await getDB();
    await db.delete("todos", id);
  } catch (err) {
    console.error("deleteTodoItem failed:", err);
  }
}

export async function toggleTodoItem(id) {
  try {
    const db = await getDB();
    const item = await db.get("todos", id);
    if (!item) return null;
    item.isCompleted = !item.isCompleted;
    item.completedAt = item.isCompleted ? new Date().toISOString() : null;
    item.updated_at = new Date().toISOString();
    await db.put("todos", item);
    return item;
  } catch (err) {
    console.error("toggleTodoItem failed:", err);
    return null;
  }
}

// ========== Folders ==========

export async function getAllFolders() {
  try {
    const db = await getDB();
    if (!db.objectStoreNames.contains("folders")) return [];
    const folders = await db.getAll("folders");
    folders.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return folders;
  } catch (err) {
    console.error("getAllFolders failed:", err);
    return [];
  }
}

export async function saveFolder(folder) {
  try {
    const db = await getDB();
    if (!folder.id) folder.id = generateId();
    if (!folder.created_at) folder.created_at = new Date().toISOString();
    folder.updated_at = new Date().toISOString();
    await db.put("folders", folder);
    return folder;
  } catch (err) {
    console.error("saveFolder failed:", err);
    throw err;
  }
}

export async function deleteFolder(id) {
  try {
    const db = await getDB();
    await db.delete("folders", id);
  } catch (err) {
    console.error("deleteFolder failed:", err);
  }
}

// ========== Search History ==========

export async function getSearchHistory(limit = 10) {
  try {
    const db = await getDB();
    if (!db.objectStoreNames.contains("search_history")) return [];
    const items = await db.getAllFromIndex("search_history", "timestamp");
    items.reverse();
    return items.slice(0, limit);
  } catch (err) {
    return [];
  }
}

export async function saveSearchQuery(query) {
  if (!query || !query.trim()) return;
  try {
    const db = await getDB();
    const existing = await db.getAll("search_history");
    const dup = existing.find((s) => s.query === query.trim());
    if (dup) {
      dup.timestamp = new Date().toISOString();
      await db.put("search_history", dup);
      return;
    }
    await db.put("search_history", {
      id: generateId(),
      query: query.trim(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) { /* ignore */ }
}

export async function clearSearchHistory() {
  try {
    const db = await getDB();
    if (db.objectStoreNames.contains("search_history")) await db.clear("search_history");
  } catch { /* ignore */ }
}

export async function getAllChatMessages() {
  try {
    const db = await getDB();
    if (!db.objectStoreNames.contains("chat_messages")) return [];
    const all = await db.getAll("chat_messages");
    all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return all;
  } catch { return []; }
}

export async function getChatStats() {
  try {
    const db = await getDB();
    if (!db.objectStoreNames.contains("chat_messages")) return { total: 0, notesWithChat: 0 };
    const all = await db.getAll("chat_messages");
    const uniqueNotes = new Set(all.map((m) => m.noteId).filter(Boolean));
    const sorted = [...all].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { total: all.length, notesWithChat: uniqueNotes.size, lastAt: sorted[0]?.timestamp || null };
  } catch { return { total: 0, notesWithChat: 0 }; }
}

export async function clearAllChatHistory() {
  try {
    const db = await getDB();
    if (db.objectStoreNames.contains("chat_messages")) await db.clear("chat_messages");
  } catch { /* ignore */ }
}

// ========== AI Chat Messages ==========

export async function getChatMessages(noteId) {
  try {
    const db = await getDB();
    if (!db.objectStoreNames.contains("chat_messages")) return [];
    const msgs = await db.getAllFromIndex("chat_messages", "noteId", noteId);
    msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return msgs;
  } catch (err) {
    console.error("getChatMessages failed:", err);
    return [];
  }
}

export async function saveChatMessage(msg) {
  try {
    const db = await getDB();
    if (!msg.id) msg.id = generateId();
    if (!msg.timestamp) msg.timestamp = new Date().toISOString();
    await db.put("chat_messages", msg);
    return msg;
  } catch (err) {
    console.error("saveChatMessage failed:", err);
    return null;
  }
}

export async function deleteChatMessages(noteId) {
  try {
    const db = await getDB();
    const msgs = await db.getAllFromIndex("chat_messages", "noteId", noteId);
    const tx = db.transaction("chat_messages", "readwrite");
    for (const m of msgs) await tx.store.delete(m.id);
    await tx.done;
  } catch { /* ignore */ }
}


// ========== Settings ==========

export async function getSetting(key) {
  try {
    const db = await getDB();
    const entry = await db.get("settings", key);
    return entry?.value;
  } catch (err) {
    console.error("getSetting failed:", err);
    return null;
  }
}

export async function setSetting(key, value) {
  try {
    const db = await getDB();
    await db.put("settings", { key, value });
  } catch (err) {
    console.error("setSetting failed:", err);
  }
}

export async function importAllNotes(notes) {
  if (!Array.isArray(notes) || notes.length === 0) return 0;
  try {
    const db = await getDB();
    const tx = db.transaction("notes", "readwrite");
    let count = 0;
    const defaults = createDefaultNote();
    for (const note of notes) {
      if (!note.id) note.id = generateId();
      if (!note.updated_at) note.updated_at = new Date().toISOString();
      if (!note.created_at) note.created_at = note.updated_at;
      for (const key of Object.keys(defaults)) {
        if (note[key] === undefined) { note[key] = defaults[key]; }
      }
      if (!note.tags) note.tags = [];
      if (!note.images) note.images = [];
      note.snippet = note.snippet || (note.body || "").slice(0, 120);
      await tx.store.put(note);
      count++;
    }
    await tx.done;
    return count;
  } catch (err) {
    console.error("importAllNotes failed:", err);
    return 0;
  }
}

export async function exportAllNotes() {
  const notes = await getAllNotes();
  return JSON.stringify(notes, null, 2);
}

export async function clearAllData() {
  const db = await getDB();
  if (db.objectStoreNames.contains("notes")) await db.clear("notes");
  if (db.objectStoreNames.contains("settings")) await db.clear("settings");
  if (db.objectStoreNames.contains("todos")) await db.clear("todos");
  if (db.objectStoreNames.contains("folders")) await db.clear("folders");
  if (db.objectStoreNames.contains("search_history")) await db.clear("search_history");
  // 重置 dbPromise 让下次打开走全新 upgrade
  dbPromise = null;
}