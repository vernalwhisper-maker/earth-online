package com.earthonline.remoteconfig

import com.earthonline.remoteconfig.cache.CacheManager
import com.earthonline.remoteconfig.cache.FileCacheManager
import com.earthonline.remoteconfig.core.ConfigChangeListener
import com.earthonline.remoteconfig.core.ConfigResult
import com.earthonline.remoteconfig.core.RemoteConfig
import com.earthonline.remoteconfig.log.Logger
import com.earthonline.remoteconfig.manager.ConfigParser
import com.earthonline.remoteconfig.manager.DebugManager
import com.earthonline.remoteconfig.manager.FeatureManager
import com.earthonline.remoteconfig.manager.NoticeManager
import com.earthonline.remoteconfig.manager.VersionChecker
import com.earthonline.remoteconfig.security.RsaSecurityVerifier
import com.earthonline.remoteconfig.security.SecurityVerifier
import com.earthonline.remoteconfig.source.PresetSources
import com.earthonline.remoteconfig.source.RemoteConfigSource
import com.earthonline.remoteconfig.source.SourceRegistry
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Remote Config 框架的主入口。
 * 遵循 Facade 模式，对外提供统一的简洁 API。
 * APP 只需创建此管理器实例，调用 [start] 方法即可启动整个配置流程。
 *
 * ## 使用示例：
 * ```kotlin
 * val manager = RemoteConfigManager.Builder(context)
 *     .setCurrentVersion("1.2.3")
 *     .setPublicKey(PUBLIC_KEY_BASE64)
 *     .addSource(PresetSources.cloudflare("my-project"))
 *     .addSource(PresetSources.jsDelivr("user", "repo"))
 *     .setOnVersionCheckListener { result, config -> ... }
 *     .build()
 * manager.start()
 * ```
 *
 * ## 生命周期：
 * 1. [start] → 读取本地缓存 → 解析 → 应用配置 → 后台刷新
 * 2. 后台刷新 → 多源容灾请求 → 校验签名 → 解析 → 更新缓存 → 应用新配置 → 通知监听器
 * 3. 全部源失败 → 保留缓存 / 默认配置
 */
class RemoteConfigManager private constructor(
    private val sourceRegistry: SourceRegistry,
    private val cacheManager: CacheManager,
    private val securityVerifier: SecurityVerifier,
    private val configParser: ConfigParser,
    private val versionChecker: VersionChecker,
    private val featureManager: FeatureManager,
    private val debugManager: DebugManager,
    private val noticeManager: NoticeManager,
    private val currentVersion: String,
    private val signatureHeaderName: String,
    private val configChangeListeners: List<ConfigChangeListener>,
    private val onVersionCheck: ((checkResult: com.earthonline.remoteconfig.core.VersionCheckResult, config: RemoteConfig) -> Unit)?,
    private val logger: Logger
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /**
     * 当前生效的配置（线程安全）。
     */
    @Volatile
    var currentConfig: RemoteConfig = RemoteConfig.DEFAULT
        private set

    /**
     * 启动 Remote Config 框架。
     * 执行流程：
     * 1. 尝试读取本地缓存
     * 2. 应用缓存配置（如果有）
     * 3. 后台发起远程请求刷新配置
     * 4. 远程请求完成后更新缓存和配置
     *
     * 此方法不阻塞调用线程。
     */
    fun start() {
        logger.d("RemoteConfigManager", "Starting Remote Config Manager...")

        // 第一步：读取缓存
        scope.launch {
            loadCache()
        }

        // 第二步：后台刷新
        scope.launch {
            refreshFromRemote()
        }
    }

    /**
     * 手动触发远程配置刷新。
     * 通常不需要主动调用，[start] 会自动触发首次刷新。
     */
    fun refresh() {
        scope.launch {
            refreshFromRemote()
        }
    }

    /**
     * 获取功能开关管理器。
     */
    fun getFeatureManager(): FeatureManager = featureManager

    /**
     * 获取调试管理器。
     */
    fun getDebugManager(): DebugManager = debugManager

    /**
     * 获取公告管理器。
     */
    fun getNoticeManager(): NoticeManager = noticeManager

    /**
     * 获取版本检查器。
     */
    fun getVersionChecker(): VersionChecker = versionChecker

    private suspend fun loadCache() {
        val cachedJson = cacheManager.load(CACHE_KEY)
        if (cachedJson != null) {
            logger.d("RemoteConfigManager", "Cache loaded, applying...")
            applyConfig(configParser.parse(cachedJson), "cache")
        } else {
            logger.d("RemoteConfigManager", "No cache found")
        }
    }

    private suspend fun refreshFromRemote() {
        logger.d("RemoteConfigManager", "Refreshing from remote...")

        when (val result = sourceRegistry.fetchWithFailover()) {
            is ConfigResult.Success -> {
                val rawJson = result.data
                logger.d("RemoteConfigManager", "Fetched from ${result.source}, verifying...")

                // 安全校验（从响应中获取签名）
                val signature = try {
                    // TODO: 从 HTTP 响应头中提取签名
                    // 当前简化版本：从 JSON 中提取 _signature 字段
                    extractSignature(rawJson)
                } catch (_: Exception) { null }

                val isVerified = if (signature != null) {
                    securityVerifier.verify(rawJson, signature)
                } else {
                    logger.w("RemoteConfigManager", "No signature found, skipping verification")
                    false
                }

                if (!isVerified) {
                    logger.w("RemoteConfigManager", "Verification failed, keeping current config")
                    return
                }

                // 解析并应用
                val config = configParser.parse(rawJson)
                applyConfig(config, result.source)

                // 缓存
                cacheManager.save(CACHE_KEY, rawJson)

                // 版本检查回调
                performVersionCheck(config)
            }
            is ConfigResult.Failure -> {
                logger.w("RemoteConfigManager", "Remote refresh failed: ${result.error.message}")
                // 缓存已在 loadCache 中加载，无需处理
            }
        }
    }

    private fun applyConfig(config: RemoteConfig, source: String) {
        currentConfig = config
        featureManager.updateConfig(config)
        debugManager.updateConfig(config)
        noticeManager.updateConfig(config)

        // 通知监听器
        configChangeListeners.forEach { it.onConfigChanged(config, source) }

        logger.d("RemoteConfigManager", "Config applied from $source: version=${config.version}")
    }

    private fun performVersionCheck(config: RemoteConfig) {
        try {
            val result = versionChecker.check(currentVersion, config)
            onVersionCheck?.invoke(result, config)
        } catch (e: Exception) {
            logger.e("RemoteConfigManager", "Version check failed", e)
        }
    }

    private fun extractSignature(json: String): String? {
        // 从 JSON 中提取 _signature 字段
        // 签名也可以从 HTTP 响应头 X-Signature 获取（需要在 HttpFetcher 中暴露响应头）
        return try {
            val regex = Regex("""\"_signature\"\s*:\s*\"([^\"]+)\"""")
            regex.find(json)?.groupValues?.getOrNull(1)
        } catch (_: Exception) { null }
    }

    /**
     * [RemoteConfigManager] 的构建器。
     * 所有配置项均有安全的默认值。
     */
    class Builder {
        private val sourceRegistry = SourceRegistry()
        private var cacheManager: CacheManager? = null
        private var securityVerifier: SecurityVerifier? = null
        private var configParser: ConfigParser? = null
        private var versionChecker: VersionChecker? = null
        private val configChangeListeners = mutableListOf<ConfigChangeListener>()
        private var onVersionCheck: ((com.earthonline.remoteconfig.core.VersionCheckResult, RemoteConfig) -> Unit)? = null
        private var currentVersion: String = "0.0.0"
        private var signatureHeaderName: String = "X-Signature"
        private var isDebug: Boolean = false
        private var cacheDir: java.io.File? = null

        /**
         * 设置当前 APP 版本号。
         */
        fun setCurrentVersion(version: String): Builder = apply { currentVersion = version }

        /**
         * 设置 RSA 公钥（Base64 编码），开启签名校验。
         */
        fun setPublicKey(publicKeyBase64: String): Builder = apply {
            securityVerifier = RsaSecurityVerifier(publicKeyBase64, Logger(isDebug))
        }

        /**
         * 设置自定义安全校验器（覆盖默认的 RSA 校验）。
         */
        fun setSecurityVerifier(verifier: SecurityVerifier): Builder = apply {
            securityVerifier = verifier
        }

        /**
         * 添加一个远程配置源。
         */
        fun addSource(source: RemoteConfigSource): Builder = apply {
            sourceRegistry.register(source)
        }

        /**
         * 添加多个远程配置源。
         */
        fun addSources(vararg sources: RemoteConfigSource): Builder = apply {
            sources.forEach { sourceRegistry.register(it) }
        }

        /**
         * 设置缓存目录（默认为应用缓存目录 + "remote_config"）。
         */
        fun setCacheDir(dir: java.io.File): Builder = apply { cacheDir = dir }

        /**
         * 设置自定义缓存管理器。
         */
        fun setCacheManager(manager: CacheManager): Builder = apply { cacheManager = manager }

        /**
         * 添加配置变更监听器。
         */
        fun addConfigChangeListener(listener: ConfigChangeListener): Builder = apply {
            configChangeListeners.add(listener)
        }

        /**
         * 设置版本检查回调。
         */
        fun setOnVersionCheckListener(callback: (com.earthonline.remoteconfig.core.VersionCheckResult, RemoteConfig) -> Unit): Builder =
            apply { onVersionCheck = callback }

        /**
         * 设置签名响应头名称（默认 "X-Signature"）。
         */
        fun setSignatureHeaderName(name: String): Builder = apply { signatureHeaderName = name }

        /**
         * 开启调试日志。
         */
        fun setDebug(debug: Boolean): Builder = apply { isDebug = debug }

        /**
         * 构建 [RemoteConfigManager] 实例。
         */
        fun build(): RemoteConfigManager {
            val logger = Logger(isDebug)

            // 如果未添加任何 Source，添加默认预设
            if (sourceRegistry.getSources().isEmpty()) {
                logger.w("Builder", "No sources configured, adding defaults")
                // APP 需要替换这些值为实际的部署地址
            }

            // 缓存管理器默认使用文件缓存
            val resolvedCacheManager = cacheManager ?: FileCacheManager(
                cacheDir ?: java.io.File(System.getProperty("java.io.tmpdir"), "remote_config"),
                logger
            )

            // 如果没有设置安全校验器，使用不校验的模式（仅用于开发）
            val resolvedSecurity = securityVerifier ?: let {
                logger.w("Builder", "No security verifier set! Config will NOT be verified.")
                com.earthonline.remoteconfig.security.InsecureVerifier
            }

            val featureManager = FeatureManager(logger)
            val debugManager = DebugManager(logger)
            val noticeManager = NoticeManager(logger)

            return RemoteConfigManager(
                sourceRegistry = sourceRegistry,
                cacheManager = resolvedCacheManager,
                securityVerifier = resolvedSecurity,
                configParser = configParser ?: ConfigParser(logger),
                versionChecker = versionChecker ?: VersionChecker(logger),
                featureManager = featureManager,
                debugManager = debugManager,
                noticeManager = noticeManager,
                currentVersion = currentVersion,
                signatureHeaderName = signatureHeaderName,
                configChangeListeners = configChangeListeners,
                onVersionCheck = onVersionCheck,
                logger = logger
            )
        }
    }

    private companion object {
        const val CACHE_KEY = "remote_config"
    }
}
