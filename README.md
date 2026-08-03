# 地球Online

一款游戏化的人生笔记与成就系统，将日常生活变成一场 MMO 式的体验。记录笔记、管理待办、解锁成就、与 AI 助手对话 —— 全部集成在一个应用中。

基于 React 19、Framer Motion、Tailwind CSS 4 和 IndexedDB 构建。支持 PWA，并通过 Capacitor 构建原生 Android APK。

> **v1.6.0** 全面套用 Telegram 设计语言（官方配色 / 聊天列表式卡片 / 统一弹窗规范）、AI 升级 DeepSeek V4 Flash 正式版（支持深度思考开关）、导出直写系统 Download（免系统安全访问）。
>
> 支持本地 AI 模型：通过 Ollama（电脑端）或 WebLLM（浏览器 WebGPU）运行 Qwen2.5，完全离线使用 AI 功能，无需 API Key。
>
> 三引擎成就匹配：Transformers.js 语义嵌入 + AI 模型 + 关键词匹配，精确关联笔记与成就。
>
> AI 批量标签：一次选中多条笔记，一键生成中文标签，支持 AI 与关键词兜底。

---

## 功能

- **笔记** —— 多种类型（日记、待办、里程碑、卡片），Markdown / 纯文本编辑，背景图案与氛围动画，文件夹分类，置顶，标签，搜索（含最近搜索历史），软删除（回收站）。未修改的笔记打开/退出不落库，时间与排序稳定。
- **待办** —— 每篇笔记独立的待办清单，支持优先级、到期日、内嵌进度条。TabBar 显示活跃待办数量角标。
- **成就** —— 60 个游戏化人生成就，分稀有度等级。通过 AI 分析或关键词匹配笔记内容自动解锁，解锁时弹出动画与彩纸特效。
- **AI 助手** —— 内置聊天面板，可分析笔记、生成摘要、执行操作（移动文件夹、添加/移除标签、更改类型、置顶/删除）。支持 DeepSeek、智谱、千问、Ollama、WebLLM。
- **AI 深度思考** —— DeepSeek V4 Flash 正式版：默认快速响应，可在 AI 设置中开启「深度思考」提升质量（摘要/标签等快速任务始终即时完成）。
- **语音听写** —— 浏览器语音识别实时转写，底部弹窗显示识别进度，一键停止。
- **AI 总结** —— 一键生成笔记摘要，可「取消（不应用）/ 确定（应用）」灵活回滚。
- **本地模型** —— Qwen2.5-1.5B/3B 完全离线运行。两种模式：Ollama（电脑运行，手机局域网调用）和 WebLLM（浏览器内 WebGPU 运行）。无需 API Key。
- **AI 批量标签** —— 选中多条笔记，一键生成中文标签，AI 或关键词匹配，自动去重追加。
- **成就匹配** —— 三引擎系统：语义嵌入（Transformers.js BERT）、AI 推理（本地或云端）、关键词匹配，结果合并去重。
- **Telegram 质感** —— 官方配色（浅色白底 / 深色 `#17212b`、accent `#3390ec`）、聊天列表式笔记卡片（渐变头像 / 时间戳 / 右下角标签）、统一磨砂弹窗与实色面板规范。
- **背景主题** —— 7 种背景色、4 种纯 CSS 图案、3 种氛围动画。零图片开销。
- **导出 / 导入** —— 笔记导出为 `.md` 或 `.eon`（AES-GCM 加密，PBKDF2 派生密钥）；Android 上直写系统「下载/EarthOnline/」（MediaStore，免系统安全访问），并支持从该目录直接导入备份。
- **开发者调试** —— 隐藏式调试模式（设置页连点 7 次触发），实时调节液态玻璃 / 导航栏 / 窗口参数并预览。
- **深色模式** —— 完整深色主题，所有组件自适应调整，对比度经全面优化。
- **无障碍** —— 遵循 `prefers-reduced-motion` 与 `prefers-reduced-transparency`。
- **PWA** —— Service Worker 离线缓存，可添加到手机主屏。
- **Android 应用** —— 通过 Capacitor 构建原生 Android APK。

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
| AI 接口 | DeepSeek V4 Flash / 智谱 / 千问 |
| 本地模型 | Ollama / WebLLM (WebGPU) |
| 加密 | Web Crypto API (AES-GCM, PBKDF2) |
| 移动端 | Capacitor 7 |
| 图标 | Lucide React |

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## Android 构建

```bash
npx cap sync android
cd android
./gradlew assembleDebug
# APK 输出：android/app/build/outputs/apk/debug/app-debug.apk
```

## 版本

v1.6.0
