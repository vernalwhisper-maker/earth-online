# Telegram Android 导航栏设计分析报告

> 分析对象：Telegram Android APK（解包目录 `D:\下载\telegram\telegram`，v12.9.1）
> 分析方法：解析 `AndroidManifest.xml`（AXML）、`classes*.dex` 字符串池、`resources.arsc` 资源索引
> 用途：为「地球Online」导航/顶部栏设计提供参考

---

## 一、导航架构总览（三层结构）

Telegram **不使用系统 ActionBar 与 Material BottomNavigationView**，全部导航组件均为自研自定义 View，集中在 `org.telegram.ui.ActionBar` 包。

```
MainActivity（单一 Activity 架构）
├── DrawerLayoutContainer（左侧抽屉容器，自研）
│   ├── 抽屉面板：账号、Saved Messages、文件夹、设置等
│   └── FragmentLayout（页面容器）
│       └── ActionBarLayout（页面栈容器，自研导航）
│           ├── BaseFragment 页面（ChatActivity 等）
│           └── 每个页面含：ActionBar（顶栏）+ 内容区
└── BottomBar（底部导航栏，自研，带模糊 iBlur3PositionBottomBar）
    └── FloatingActionMode（悬浮操作按钮区）
```

**关键类（dex 实测确认）**：
| 类 | 作用 |
|---|---|
| `org.telegram.ui.LaunchActivity` | 登录/启动入口 |
| `org.telegram.ui.ChatActivity` | 聊天主页面（核心页面） |
| `ActionBar.Layout`（`ActionBarLayout`） | 页面栈导航容器（push/pop 页面） |
| `ActionBar.INavigationLayout` | 导航布局接口（页面切换协议） |
| `ActionBar.ActionBar` | 自研顶栏 |
| `ActionBar.DrawerLayoutContainer` | 左侧抽屉容器 |
| `ActionBar.BaseFragment` | 页面基类（含 `BottomSheetParams` 弹层协议） |
| `ActionBar.MenuDrawable` / `BackDrawable` | 汉堡/返回图标（动画变形） |
| `ActionBar.BottomSheet` / `BottomSheetTabs` | 底部弹层体系 |
| `FloatingActionMode` | 悬浮操作按钮 |

---

## 二、顶部导航栏（ActionBar）设计

自研 `org.telegram.ui.ActionBar.ActionBar`，**非系统 ActionBar、非 AppCompat**（dex 中仅 androidx 库使用系统 ActionBar）。

### 布局结构（左右中三段）
```
[汉堡/返回按钮] [标题 + 副标题] ...... [菜单项...] [更多(⋮)]
```

| 区域 | 实现 | 特征 |
|---|---|---|
| 左侧按钮 | `MenuDrawable`（汉堡）/ `BackDrawable`（返回） | **三横线→箭头变形动画**，点击抽屉开合联动 |
| 标题区 | `SimpleTextView` + `ActionBarAnimatedSubtitleOverlayContainer` | 标题（粗体）+ 副标题（次文字），**副标题可滚动淡入淡出** |
| 右侧菜单 | `ActionBarMenu` + `ActionBarMenuItem` | 图标菜单项；长按/点击弹出 `ActionBarPopupWindow` |
| 更多菜单 | `ActionBarMenuSubItem` | 溢出菜单（⋮）|

### 视觉特征
- 高度约 56dp，**状态栏沉浸**（`fitsSystemWindows` 处理）
- 背景：默认透明（页面内容上浮），支持着色（`ColoredActionBar`）、模糊（`iBlur3PositionBottomBar` 同类模糊技术）
- 分隔线：无硬边框，靠背景色差区分
- 渐变：主题色渐变背景（`Theme.BackgroundDrawableSettings`）

---

## 三、底部导航栏（BottomBar）

**自研 BottomBar + 模糊**（dex 常量 `iBlur3PositionBottomBar` 证实存在模糊参数体系）。

### 设计要点
- **5 个 Tab**：Chats（聊天）、Contacts（联系人）/Calls（通话）、Archived（归档）、Settings（设置）——按版本调整
- **图标 + 无文字标签**（窄屏仅图标，Material You 动态主题）
- **选中态**：accent 蓝色（`#3390ec`）+ 图标微缩放；未选中灰（`#707579`）
- **背景**：跟随页面主题色，支持模糊/透明（`Blur` 系列）
- **未读徽章**：右上角胶囊（accent 蓝底白字，`#3390ec`）
- **Tab 切换**：页面栈隔离（各 Tab 独立 `ActionBarLayout` 栈），切换无重建

### 与 Material 规范差异
- 不用官方 `BottomNavigationView`（自研，性能与动效可控）
- 无「选中指示条」（Material 的 32dp pill），用**颜色 + 图标**区分
- Tab 高度约 56dp，底部安全区适配（`safe-area-bottom`）

---

## 四、左侧抽屉（DrawerLayoutContainer）

- **自研** `DrawerLayoutContainer`（不用 AndroidX DrawerLayout）
- 抽屉内容：账号头部（头像+名称+状态）、Saved Messages、文件夹、Telegram 设置入口、帮助等
- **开合动效**：内容区跟随平移 + 缩放（contentScale），背景遮罩淡入
- 汉堡图标（`MenuDrawable`）与抽屉开合**动画联动**（三横线→箭头）

---

## 五、页面切换机制

- 单一 Activity + **Fragment 栈**（`ActionBarLayout` push/pop）
- `INavigationLayout` 接口统一页面导航协议
- 页面过渡：**滑动 + 淡入**（iOS 风格交互），返回手势支持
- 每个 Tab 独立页面栈（返回键回到当前 Tab 栈顶）

---

## 六、主题与视觉体系（导航相关）

- **颜色全部内联在 `org.telegram.ui.ActionBar.Theme`（Theme.java）**，res/ 资源无主题色（实测 res/color 仅 appcompat/谷歌标准色）
- 浅色：背景纯白 `#ffffff`、分组 `#f1f1f1`、主文字 `#000000`、次文字 `#707579`、accent `#3390ec`
- 深色：背景 `#17212b`/`#232e3c`、次文字 `#7d90a9`、accent 同蓝
- 动态主题（`ThemeAccent`、`EmojiThemes`）：accent 色可换，Material You 取色
- 阴影：黑 alpha 27（`default_shadow_color`）
- **底部导航栏系统色适配**（`onWebAppSetNavigationBarColor`）：WebView 内容可请求改系统导航栏颜色

---

## 七、对「地球Online」的启示（结合我们的 TabBar）

| Telegram 特性 | 地球Online 现状 | 可借鉴 |
|---|---|---|
| 汉堡→返回变形动画 | TabBar 无顶部变形按钮 | 编辑器顶栏返回/菜单可用 `BackDrawable` 式动画 |
| 底部栏模糊（iBlur） | TabBar 已有液态玻璃+调试参数 | 已对齐（blur 参数联动） |
| 未读/计数徽章（胶囊蓝底白字） | 已有 todo/成就徽章 | 样式已接近 |
| 选中态：颜色+图标（无 pill） | 当前有 `liquid-pill` 选中胶囊 | 可选：简化选中态为颜色+缩放（更 TG） |
| Tab 独立页面栈 | 单页面状态切换（`setCurrentPage`） | 大改，暂不采纳 |
| 抽屉 + 汉堡动画 | 底部 TabBar 架构（用户已定保留） | 不引入抽屉，保持结构 |
| 状态栏沉浸 | `StatusBar.setOverlaysWebView` 已配置 | 已对齐 |
| 页面滑动过渡 + 返回手势 | 页面 spring 横滑过渡 | 已对齐（原始动画） |

---

## 八、结论

Telegram 导航栏的核心设计哲学：
1. **全自研控件**——不用系统导航组件，保证动效与性能完全可控
2. **顶部 ActionBar 承担主要导航**（汉堡/返回/标题/菜单），底部 Bar 仅做 Tab 切换
3. **动效克制**：变形动画（汉堡→箭头）、模糊背景、页面滑动——都是"即时响应 + 轻微弹性"
4. **主题集中管理**（Theme.java 单一数据源），支持深浅色与动态 accent
5. **沉浸式**：状态栏沉浸、系统导航栏颜色联动

地球Online 已通过此前的「TG 质感」改造对齐了其中大部分视觉语言（配色、模糊、徽章、页面过渡）；本报告可作为后续顶部栏/按钮动效打磨（如汉堡→返回变形、选中态简化）的参考依据。
