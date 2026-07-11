import { openDB } from "idb";

const DB_NAME = "earth-online";
const DB_VERSION = 1;

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("notes")) {
          const store = db.createObjectStore("notes", { keyPath: "id" });
          store.createIndex("updated_at", "updated_at", { unique: false });
          store.createIndex("created_at", "created_at", { unique: false });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllNotes() {
  const db = await getDB();
  const notes = await db.getAll("notes");
  notes.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  return notes;
}

export async function getNote(id) {
  const db = await getDB();
  return db.get("notes", id);
}

export async function saveNote(note) {
  const db = await getDB();
  note.updated_at = new Date().toISOString();
  if (!note.created_at) note.created_at = note.updated_at;
  if (!note.id) note.id = crypto.randomUUID();
  await db.put("notes", note);
  return note;
}

export async function deleteNote(id) {
  const db = await getDB();
  await db.delete("notes", id);
}

export async function getSetting(key) {
  const db = await getDB();
  const entry = await db.get("settings", key);
  return entry?.value;
}

export async function setSetting(key, value) {
  const db = await getDB();
  await db.put("settings", { key, value });
}

export async function importAllNotes(notes) {
  if (!Array.isArray(notes) || notes.length === 0) return 0;
  const db = await getDB();
  const tx = db.transaction("notes", "readwrite");
  let count = 0;
  for (const note of notes) {
    if (!note.id) note.id = crypto.randomUUID();
    if (!note.updated_at) note.updated_at = new Date().toISOString();
    if (!note.created_at) note.created_at = note.updated_at;
    // Ensure tags is an array
    if (!note.tags) note.tags = [];
    await tx.store.put(note);
    count++;
  }
  await tx.done;
  return count;
}

export async function exportAllNotes() {
  const notes = await getAllNotes();
  return JSON.stringify(notes, null, 2);
}

export async function clearAllData() {
  const db = await getDB();
  await db.clear("notes");
  await db.clear("settings");
}
