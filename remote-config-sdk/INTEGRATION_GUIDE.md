# Remote Config SDK 部署与集成指南

## 目录结构

```
remote-config-sdk/
├── build.gradle.kts
├── update.example.json
└── src/main/kotlin/com/earthonline/remoteconfig/
    ├── RemoteConfigManager.kt          # 主入口（Facade）
    ├── core/
    │   └── Models.kt                    # 数据模型 + 结果封装
    ├── source/
    │   ├── RemoteConfigSource.kt        # 源接口
    │   ├── HttpRemoteConfigSource.kt    # 通用 HTTP 源 + 预设源工厂
    │   └── SourceRegistry.kt           # 多源容灾调度器
    ├── network/
    │   └── HttpFetcher.kt              # HTTP 请求执行器
    ├── cache/
    │   └── CacheManager.kt             # 缓存管理器
    ├── security/
    │   └── SecurityVerifier.kt         # RSA 签名校验器
    ├── manager/
    │   ├── ConfigParser.kt             # JSON 解析器
    │   ├── VersionChecker.kt           # 版本检查器
    │   ├── FeatureManager.kt           # 功能开关管理器
    │   ├── DebugManager.kt             # 调试管理器
    │   └── NoticeManager.kt            # 公告管理器
    └── log/
        └── Logger.kt                   # 统一日志工具
```

## 部署步骤

### 1. 准备 update.json

复制 `update.example.json`，修改为你的实际值，部署到以下位置：

| 源 | 部署方式 | URL 示例 |
|---|---------|---------|
| **Cloudflare Pages** | 放入 Pages 项目根目录，git push 自动部署 | `https://<project>.pages.dev/update.json` |
| **Vercel** | 放入 `public/` 目录，git push 自动部署 | `https://<project>.vercel.app/update.json` |
| **GitHub + jsDelivr** | 提交到 GitHub 仓库任意分支 | `https://cdn.jsdelivr.net/gh/<user>/<repo>@<branch>/update.json` |

### 2. 生成签名密钥对

```bash
# 生成 RSA-2048 私钥
openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048

# 导出公钥（Base64 格式，不包含头尾标记和换行）
openssl rsa -pubout -in private_key.pem -out public_key.pem
# 手动复制 public_key.pem 的内容（去掉 -----BEGIN PUBLIC KEY----- 和 -----END PUBLIC KEY----- 以及换行）

# 签名 update.json
openssl dgst -sha256 -sign private_key.pem -out update.json.sig update.json

# 将签名转为 Base64
# Linux/macOS: cat update.json.sig | base64 -w0
# Windows PowerShell: [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("update.json.sig"))
```

### 3. 将签名附加到 update.json

在 `update.json` 中添加 `_signature` 字段：

```json
{
  "version": "1.2.3",
  ...
  "_signature": "Base64编码的签名值"
}
```

> 或者将签名放在 HTTP 响应头 `X-Signature` 中（需要源服务器支持自定义响应头）。

### 4. 在 APP 中集成

```kotlin
// 1. 在 Application.onCreate() 中初始化
val manager = RemoteConfigManager.Builder()
    .setCurrentVersion(BuildConfig.VERSION_NAME)        // 当前版本
    .setPublicKey(PUBLIC_KEY_BASE64)                    // 公钥（从上面步骤2获取）
    .addSource(PresetSources.cloudflare("my-project"))  // Cloudflare Pages
    .addSource(PresetSources.jsDelivr("user", "repo"))  // jsDelivr 备用
    .addSource(PresetSources.githubRaw("user", "repo")) // GitHub raw 兜底
    .setDebug(BuildConfig.DEBUG)                        // 调试模式
    .setOnVersionCheckListener { result, config ->
        when (result) {
            VersionCheckResult.BELOW_MIN_VERSION -> {
                // 弹窗：必须更新，禁止进入 APP
                showForceUpdateDialog(config)
            }
            VersionCheckResult.NEW_VERSION_AVAILABLE -> {
                // 弹窗：发现新版本
                showUpdateDialog(config)
            }
            VersionCheckResult.UP_TO_DATE -> { /* 无需操作 */ }
        }
    }
    .addConfigChangeListener { newConfig, source ->
        Log.d("App", "Config updated from $source")
    }
    .build()

manager.start()

// 2. 使用功能开关
if (manager.getFeatureManager().isEnabled("AI")) {
    enableAIAssistant()
}

// 3. 监听调试状态变化
manager.getDebugManager().onDebugStateChanged = { isDebug ->
    if (isDebug) {
        showDebugMenu()
    }
}

// 4. 监听公告
manager.getNoticeManager().onNoticeAvailable = { notice ->
    showNoticeDialog(notice.title, notice.content)
}
```

## 安全建议

1. **私钥安全**：私钥仅用于签名，永远不要提交到代码仓库或暴露给客户端。
2. **公钥内置**：公钥硬编码在 APP 代码中，即使被逆向，攻击者也只能验证不能签名。
3. **防回滚攻击**：如有更高安全需求，可在本地缓存中记录上一次的可信版本号，拒绝低于该版本的配置。
4. **定期轮换密钥**：建议每 6-12 个月更换一次密钥对。
5. **HTTPS 是基础**：签名校验是安全第二道防线，HTTPS 仍是第一道。

## 性能优化建议

1. **缓存优先**：APP 启动时优先读取缓存，确保 UI 秒级呈现，不等待网络。
2. **后台刷新**：网络请求在后台协程中执行，不阻塞主线程。
3. **ETag 减少带宽**：服务端支持 ETag 时，304 响应直接使用缓存，节省流量。
4. **请求超时**：3 秒连接超时 + 3 秒读取超时，避免弱网下长时间等待。
5. **协程 + SupervisorJob**：单个源失败不影响其他源，整体异常不崩溃。

## 可扩展建议

1. **新增配置字段**：只需在 `RemoteConfig` data class 中添加新属性（带默认值），无需修改任何其他代码。
2. **新增配置源**：实现 `RemoteConfigSource` 接口，调用 `sourceRegistry.register()` 注册。
3. **新增 Feature Flag**：远程 JSON 中直接添加新 key，客户端用 `featureManager.isEnabled("KeyName")` 读取。
4. **灰度发布**：`grayscale` 字段预留为 Map，可按用户 ID 哈希或百分比决定是否命中灰度。
5. **实验功能**：`experiments` 字段预留，key-value 结构，可存放任意实验参数。
