# 地球Online (Earth-Online) 项目开发日志

> 基于小米澎湃笔记 App 2.6.5.5 逆向分析优化

---

## 一、项目概况

- **项目名称**: 地球Online
- **技术栈**: React 19 + Zustand + Tailwind CSS 4 + Framer Motion + IndexedDB (idb) + Capacitor 7
- **包名**: com.earthonline.app
- **定位**: 游戏化的人生笔记与成就系统

---

## 二、功能进度

### P0 — 数据模型升级
- 参考小米笔记 `NoteEntity`，重构笔记数据模型（17+ 字段）
- 新增字段：`noteType`, `isPinned`, `bgColorId`, `folderId`, `reminderDate`, `deletedAt`, `isPrivate`, `parentId`, `images`, `contentMarkdown`, `snippet`
- IndexedDB DB_VERSION 1→2 迁移
- 软删除（回收站）机制
- 置顶优先排序
- 文件夹分类（inbox/personal/work/study/archive）
- 6 种背景颜色主题
- 笔记类型：journal/todo/milestone/flashcard

### P1 — Todo 待办子系统
- 独立 `todos` object store（DB v3）
- TodoItem CRUD：内容、优先级、到期日期、完成状态
- TodoChecklist 组件（编辑器中内嵌）
- 首页 NoteCard 显示待办进度条
- TabBar 待办计数徽章

### P2 — Markdown 编辑器
- `react-markdown` + `remark-gfm` 渲染
- 编辑/预览双模式切换
- 工具栏（粗体、斜体、标题、列表、链接、图片）
- 内容存入 `contentMarkdown` 字段

### P3 — AI 深度集成
- AI 助手面板（浮动按钮 + 聊天窗口）
- `chatWithAI()` / `generateSummary()` API
- 笔记摘要生成
- AI 可执行工具：移动笔记、添加/移除标签、更改类型、置顶、删除
- 工具调用通过 `【ACTION】JSON` 格式
- AI 系统提示词注入项目架构上下文
- 聊天记录持久化到 IndexedDB

### P4 — 页面系统与动效
- 纯 CSS 背景图案：网格、点阵、横线
- 环境动效：星空粒子、浮游几何、流光
- BackgroundSelector UI（颜色 + 图案 + 动效三级选择）
- 7 种颜色主题

### P5 — 系统级优化
- 自定义文件夹管理（CRUD）
- 搜索历史（最近 5 条，可清除）
- 全字段检索（title、body、contentMarkdown、tags）
- 笔记关联（NoteLinks 显示父笔记）

---

## 三、关键架构决策

### 数据层
```
IndexedDB (idb):
  notes       — 笔记主存储（DB_VERSION 5）
  settings    — 设置 KV 存储
  todos       — 待办事项
  folders     — 自定义文件夹
  search_history — 搜索历史
  chat_messages  — AI 对话记录
```

### 状态管理
```
Zustand:
  useNoteStore       — 笔记 CRUD + 过滤
  useTodoStore       — 待办 CRUD + 按笔记分组
  useSettingsStore   — 模型/API Key/推理参数/深色模式
  useAchievementStore — 成就解锁状态
  useFolderStore     — 文件夹管理
```

### 路由（简易）
```
App 级：home / editor / gallery / achievement-detail / settings
Settings 子页：ai / notification / more
```

---

## 四、APK 打包与 Android 适配

### 通知
- `@capacitor/local-notifications@7.0.7`
- 必需权限：`POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`
- 小米澎湃OS 要求：必须设置 `smallIcon`（已创建矢量图标 `ic_stat_note.xml`）
- 通知渠道 `earth-online-reminders`（importance=5, visibility=1）
- `allowWhileIdle: true` 省电模式可触发
- 双引擎：原生 Capacitor + Web Notification API 兜底

### 导出
- 策略：Cache 目录写入 → Web 下载 → Share.share 分享
- FileProvider 已配置（`file_paths.xml` 含 cache-path）

### AndroidManifest 核心权限
```xml
INTERNET, POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED,
SCHEDULE_EXACT_ALARM, USE_EXACT_ALARM, FOREGROUND_SERVICE,
WRITE_EXTERNAL_STORAGE (maxSdk=28), READ_EXTERNAL_STORAGE (maxSdk=32)
```

---

## 五、关键文件清单

```
src/
├── App.jsx                          — 主路由 + 全局状态
├── main.jsx                         — 入口 (ErrorBoundary 包裹)
├── index.css                        — Tailwind + Markdown + 图案样式
├── data/
│   ├── noteTypes.js                 — 笔记类型/颜色/文件夹常量
│   ├── todoTypes.js                 — 待办数据模型
│   ├── themeTypes.js                — 背景/动效主题
│   ├── achievements.js              — 60 个成就数据
│   └── chatTypes.js                 — AI 对话消息模型
├── db/
│   └── index.js                     — IndexedDB 封装 (v5)
├── store/
│   ├── noteStore.js                 — 笔记状态
│   ├── todoStore.js                 — 待办状态
│   ├── settingsStore.js             — 设置状态（含 darkMode）
│   ├── achievementStore.js          — 成就状态
│   └── folderStore.js               — 文件夹状态
├── utils/
│   ├── notifications.js             — 通知服务（双引擎）
│   ├── aiChat.js                    — AI API + 工具定义
│   ├── aiTools.js                   — AI 工具执行器
│   ├── crypto.js                    — 加密工具
│   └── notesFile.js                 — .eon 文件格式
├── pages/
│   ├── HomePage.jsx                 — 首页（搜索/筛选/长按选择/批量操作）
│   ├── NoteEditorPage.jsx           — 笔记编辑器
│   ├── SettingsPage.jsx             — 设置主页（导航式）
│   └── subpages/
│       ├── AISettingsPage.jsx       — AI 设置二级页
│       ├── NotificationSettingsPage.jsx — 通知设置二级页
│       └── MoreSettingsPage.jsx     — 更多设置二级页
├── components/
│   ├── notes/
│   │   └── NoteCard.jsx             — 笔记卡片（类型徽章/进度条）
│   │   └── NoteLinks.jsx            — 笔记关联
│   ├── todo/
│   │   └── TodoChecklist.jsx        — 待办清单组件
│   ├── editor/
│   │   ├── MarkdownEditor.jsx       — Markdown 编辑器
│   │   ├── BackgroundSelector.jsx   — 背景与动效选择器
│   │   └── AmbientAnimation.jsx     — 环境动效组件
│   ├── ai/
│   │   └── AIAssistant.jsx          — AI 助手面板
│   ├── layout/
│   │   └── TabBar.jsx               — 底部导航栏
│   └── achievements/
│       └── UnlockModal.jsx          — 成就解锁弹窗
├── api/
│   └── ai.js                        — 成就匹配 API
└── styles/
    └── patterns.css                 — 背景图案 CSS
```

---

## 六、小米笔记参考要点

- **软删除**: `deletedAt` 字段标记，非物理删除
- **noteType**: main/todo/summary/mindmap/outline/flashcard/dialogue_blog/schedule
- **MAML 动画**: XML 定义变量动画、重力传感器、缓动函数
- **主题系统**: 夜空/叶子/几何/影子主题
- **数据隔离**: SecretSyncRoot 私密笔记独立加密容器
- **AI 集成**: ChatItemProto + ConversationMessageProto + rollback_operation
- **通知**: 小米澎湃OS 强制要求 smallIcon

---

## 七、构建与部署

```bash
# Web 构建
npx vite build

# Android 同步
npx cap sync android

# 调试 APK 构建
cd android && .\gradlew.bat assembleDebug

# 安装到设备
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```
