// AI 工具执行器 — 解析并执行 AI 的【ACTION】指令
import useNoteStore from "../store/noteStore";

// 解析 AI 回复中的【ACTION】块
export function parseActions(text) {
  if (!text) return [];
  const regex = /【ACTION】(\[.*?\])/g;
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const actions = JSON.parse(match[1]);
      if (Array.isArray(actions)) {
        matches.push(...actions);
      } else {
        matches.push(actions);
      }
    } catch (e) {
      console.warn("Failed to parse action:", match[1], e);
    }
  }
  return matches;
}

// 从回复中移除【ACTION】部分，只保留显示内容
export function stripActions(text) {
  if (!text) return text;
  return text.replace(/【ACTION】\[.*?\]/g, "").trim();
}

// 执行单个操作
export async function executeAction(action, notes) {
  const { action: type, params } = action;
  if (!type || !params) return { success: false, message: "无效的操作格式" };

  // 按标题模糊匹配笔记
  const findNote = (title) => {
    if (!title) return null;
    const q = title.toLowerCase();
    return notes.find(
      (n) => n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q)
    );
  };

  try {
    switch (type) {
      case "moveNoteToFolder": {
        const note = findNote(params.noteTitle);
        if (!note) return { success: false, message: "未找到匹配的笔记：" + params.noteTitle };
        note.folderId = params.folderId;
        const store = useNoteStore.getState();
        await store.saveNote(note);
        return { success: true, message: "已移动「" + note.title + "」到文件夹" };
      }

      case "addTag": {
        const note = findNote(params.noteTitle);
        if (!note) return { success: false, message: "未找到匹配的笔记：" + params.noteTitle };
        if (!note.tags) note.tags = [];
        if (!note.tags.includes(params.tag)) {
          note.tags.push(params.tag);
          const store = useNoteStore.getState();
          await store.saveNote(note);
          return { success: true, message: "已为「" + note.title + "」添加标签「" + params.tag + "」" };
        }
        return { success: true, message: "标签「" + params.tag + "」已存在" };
      }

      case "removeTag": {
        const note = findNote(params.noteTitle);
        if (!note) return { success: false, message: "未找到匹配的笔记：" + params.noteTitle };
        if (note.tags) {
          note.tags = note.tags.filter((t) => t !== params.tag);
          const store = useNoteStore.getState();
          await store.saveNote(note);
          return { success: true, message: "已移除「" + note.title + "」的标签「" + params.tag + "」" };
        }
        return { success: true, message: "标签不存在" };
      }

      case "setNoteType": {
        const note = findNote(params.noteTitle);
        if (!note) return { success: false, message: "未找到匹配的笔记：" + params.noteTitle };
        note.noteType = params.noteType;
        const store = useNoteStore.getState();
        await store.saveNote(note);
        return { success: true, message: "已将「" + note.title + "」类型改为" + params.noteType };
      }

      case "setPinned": {
        const note = findNote(params.noteTitle);
        if (!note) return { success: false, message: "未找到匹配的笔记：" + params.noteTitle };
        note.isPinned = params.pinned;
        const store = useNoteStore.getState();
        await store.saveNote(note);
        return { success: true, message: "已" + (params.pinned ? "置顶" : "取消置顶") + "「" + note.title + "」" };
      }

      case "deleteNote": {
        const note = findNote(params.noteTitle);
        if (!note) return { success: false, message: "未找到匹配的笔记：" + params.noteTitle };
        const store = useNoteStore.getState();
        await store.deleteNote(note.id);
        return { success: true, message: "已删除「" + note.title + "」" };
      }

      default:
        return { success: false, message: "未知操作：" + type };
    }
  } catch (err) {
    console.error("Action execution failed:", err);
    return { success: false, message: "执行失败：" + err.message };
  }
}
