# 地球Online

一款游戏化的人生笔记与成就系统，将日常生活变成一场 MMO 式的体验。记录笔记、管理待办、解锁成就、与 AI 助手对话 -- 全部集成在一个应用中。

基于 React 19、Framer Motion、Tailwind CSS 4 和 IndexedDB 构建。支持 PWA 和 Capacitor 原生 Android APK。

---

## 功能

- **笔记** -- 多种类型（日记、待办、里程碑、卡片），Markdown 编辑，背景图案和氛围动画，文件夹分类，置顶，标签，搜索（含最近搜索历史），软删除（回收站）。
- **待办** -- 每篇笔记独立的待办清单，支持优先级、到期日、内嵌进度条。TabBar 显示活跃待办数量的角标。
- **成就** -- 60 个游戏化人生成就（如"全款置业""学会乐器"），分稀有度等级。通过 AI 分析或关键词匹配笔记内容自动解锁，解锁时弹出动画和彩纸特效。
- **AI 助手** -- 内置聊天面板，可分析笔记、生成摘要、执行操作（移动文件夹、添加/移除标签、更改类型、置顶/删除）。支持 DeepSeek、智谱、千问三家模型供应商。
- **背景主题** -- 7 种背景色、4 种纯 CSS 图案（网格、点阵、横线、纯色）、3 种氛围动画（星空粒子、浮游几何、流光）。零图片开销。
- **加密导出** -- 笔记可导出为 `.eon` 文件，使用 AES-GCM 加密（PBKDF2 派生密钥）。
- **深色模式** -- 完整的深色主题，所有组件自适应调整。
- **无障碍** -- 遵循 `prefers-reduced-motion` 和 `prefers-reduced-transparency`，为前庭敏感用户提供安全体验。
- **PWA** -- 通过 Service Worker 支持离线访问和缓存，可添加到手机主屏。
- **Android 应用** -- 通过 Capacitor 构建原生 Android APK，集成状态栏和返回键处理。

---

## 技术栈

| 层 | 技术 |
|-------|-----------|
| 框架 | React 19 |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 4 |
| 动画 | Framer Motion 12 |
| 状态管理 | Zustand 5 |
| 数据库 | IndexedDB (idb 8) |
| AI 接口 | DeepSeek / 智谱 / 千问 |
| 加密 | Web Crypto API (AES-GCM, PBKDF2) |
| 移动端 | Capacitor 7 |
| 图标 | Lucide React |

---

## 快速开始

### 前置要求

- Node.js >= 18
- npm

### 安装

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

浏览器访问 `http://localhost:5173`。

### 生产构建

```bash
npm run build
npm run preview
```

### Android 构建

```bash
npx cap sync android
cd android
./gradlew.bat assembleDebug
```

APK 文件位于 `android/app/build/outputs/apk/debug/app-debug.apk`。

---

## 配置

### AI 供应商

进入 设置 > AI 设置 进行配置：

- **供应商**: DeepSeek、智谱或千问
- **API 密钥**: 你的 API 密钥（本地加密存储）
- **参数**: 温度、最大 Token 数、top-p

AI 功能完全可选，应用无需联网即可正常使用。

### 外观

- 在设置中切换深色模式
- 在设置 > 更多设置 中调整 TabBar 透明度
- 在笔记编辑器中设置单篇笔记的背景和氛围动画

---

## 数据模型

IndexedDB 数据库 `earth-online`（当前 schema 版本 v5），包含 6 个对象存储：

- `notes` -- 核心笔记数据，包含类型、标签、文件夹、置顶、背景、Markdown 标记等元数据
- `todos` -- 每篇笔记的待办项（内容、优先级、到期日、完成状态）
- `settings` -- 应用设置（AI 配置、主题、TabBar 透明度）
- `folders` -- 自定义文件夹定义
- `search_history` -- 最近搜索记录
- `chat_messages` -- 每篇笔记的 AI 聊天历史

---

## 设计理念

界面基于 Apple 人机界面指南构建，参考 WWDC 设计讲座（Designing Fluid Interfaces 2018、Principles of Great Design 2026、The Details of UI Typography 2020）：

- **可中断性** -- 所有动画使用弹簧模型，可在运动中随时抓取和反转
- **空间一致性** -- 页面过渡进出路径对称；弹窗从触发源位置展开
- **直接操控** -- 手势 1:1 追踪，所有可点按元素提供按下即时反馈
- **材质深度** -- 透明毛玻璃效果配合 `backdrop-filter: blur()` 和多层边框
- **排版** -- 光学尺寸适配，字距随字号变化（大标题收紧，正文放松）
- **减少动效** -- 完整的 `prefers-reduced-motion` 支持，平稳降级

---

## 许可证

MIT
