# 地球Online 导航栏与互动效果介绍

> 依据当前源码（`src/App.jsx`、`src/components/layout/TabBar.jsx`、`src/pages/*`）整理

---

## 一、导航架构总览

**单页应用（SPA）+ 状态路由**，无 URL 路由库，页面切换由 App 级 `currentPage` 状态驱动：

```
App.jsx
├── <main>（页面容器，AnimatePresence 过渡）
│   └── HomePage（笔记列表）| NoteEditorPage（编辑器）| AchievementGalleryPage（成就）| AchievementDetailPage（成就详情）| SettingsPage（设置）
├── FAB（新建笔记，仅首页）
├── AIAssistant 浮动按钮（仅首页）
├── TabBar（底部导航栏，三模式）
└── 全局浮层：成就解锁弹窗 / Toast / 使用须知 / 版本更新
```

**页面清单**（`PAGE_ORDER` 决定过渡方向）：
| 页面 | 路由 key | 入口 |
|---|---|---|
| 首页（笔记） | `home` | 默认 |
| 编辑器 | `editor` | 首页点卡片 / FAB 新建 |
| 成就画廊 | `gallery` | TabBar「成就」 |
| 成就详情 | `achievement-detail` | 画廊点成就卡 |
| 设置 | `settings` | TabBar「设置」（含 AI/更多/调试子页） |

---

## 二、底部导航栏（TabBar）——三模式

位置：`fixed bottom-6` 悬浮胶囊（离底 1.5rem、水平居中、宽 `calc(100%-2.5rem)`、`max-w-sm`），毛玻璃 + 圆角 2rem + 阴影，底部安全区适配（`safe-area-bottom`）。

### 模式 1：普通导航（3 个 Tab）
```
[📄 笔记] [🏆 成就] [⚙️ 设置]
```
- **选中态**：`layoutId="liquid-pill"` 液态胶囊（毛玻璃渐变底）+ 图标放大（scale 1.12）+ 上移 1px + accent 蓝 + 发光阴影
- **未选中**：灰（`text-warm-steel/70`）
- **徽章**：首页显示待办计数（蓝底胶囊）、成就显示解锁数（accent 蓝底胶囊），spring 弹入动画
- 图标点击 `whileTap scale 0.92`

### 模式 2：编辑器操作栏（进入编辑器时）
TabBar 从导航切换为**编辑操作**（`currentPage === "editor"`）：
```
[📌 置顶] [💾 保存] [✨ 匹配成就] [🎨 更多] [# 标签]
```
- 全部通过 `editorActionsStore` 与编辑器联动（Zustand 中转，无需 prop 层层传递）
- 「匹配成就」触发保存 + AI 成就匹配，分析中显示「分析中…」并禁用
- 「更多」弹出底部玻璃弹窗（背景/动效/文件夹切换）
- 「标签」弹出标签管理弹窗

### 模式 3：选择模式操作栏（首页长按/勾选笔记时）
```
[🗑 删除] [📁 移动] [📌 置顶/取消] [# 删标签] [✨ 量建标签] [选中计数]
```
- 由 `editor.selectCount > 0` 触发，图标区旁显示选中数量（liquid-pill 内数字）
- 删除需确认（底部红色确认弹窗）；「量建标签」调 AI/关键词生成标签

### 弹窗体系（TabBar 内 4 个）
删除确认 / 标签管理 / 更多 / 批量删标签——全部为**底部悬浮毛玻璃弹窗**（与 GlassModal 统一：深色 `rgba(35,46,60,0.94)`、深浅自适应双层边框、顶部高光、spring 弹入 `scale 0.6 + y 40`）。

---

## 三、页面过渡动画

`<AnimatePresence mode="wait">` 包裹页面，方向由 `PAGE_ORDER` 索引差决定：

| 场景 | 动画 |
|---|---|
| 页面切换（home/settings/gallery） | 横向滑动 + 淡入淡出（`x ±80 + opacity`），spring `stiffness 300 damping 30` |
| 进入编辑器 | 右侧滑入（`x 120 → 0`） |
| 返回上一页 | 反向滑动 |

`mode="wait"`：旧页面退出动画完成 → 新页面进入，无重叠闪烁。

---

## 四、FAB 与 AI 助手（仅首页）

- **新建 FAB**：右下 `bottom-32 right-5`，accent 蓝圆钮（`#3390ec`），TG 蓝阴影；`whileTap scale 0.85` 按压反馈；点击进入新建笔记
- **AI 助手按钮**：FAB 上方（`bottom-48`），紫色圆钮；点击展开聊天面板（右下角 `w-80 h-96` 毛玻璃卡片），支持聊天、笔记分析、AI 总结、执行工具（移动/加标签/改类型/置顶/删除）

---

## 五、顶部导航（编辑器顶栏）

- 左侧：返回按钮（保存当前内容后退出）+ 语音听写 + AI 总结
- 中间：日期
- 右侧：导出菜单 + 保存状态（自动保存中 / 已保存 / AI 分析中 / 保存失败）

---

## 六、互动效果汇总

| 元素 | 效果 |
|---|---|
| Tab 切换 | 液态胶囊滑动（layoutId 共享动画）+ 图标 spring 放大 |
| 按钮按压 | `whileTap` 缩放（0.85–0.97），spring `stiffness 400–500` |
| 徽章 | spring 弹入（`scale 0 → 1`） |
| 弹窗 | 底部玻璃弹入（`scale 0.6 + y 40` spring）或居中（`scale 0.92` spring） |
| 页面切换 | 横向滑动 + 淡入，spring |
| 深色模式 | 全组件适配（白字/深蓝灰玻璃/深浅边框） |
| 减少动效 | `prefers-reduced-motion` 与设置内开关全局生效 |
