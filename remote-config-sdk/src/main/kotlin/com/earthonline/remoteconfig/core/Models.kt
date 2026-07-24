package com.earthonline.remoteconfig.core

/**
 * 远程配置的顶级数据模型。
 * 所有字段均有默认值，未知字段被 JSON 解析器自动忽略（kotlinx.serialization 的 @Ignored 机制）。
 * 新字段加入时只需在此 data class 中添加可选/默认字段，不破坏旧客户端。
 *
 * @property version 最新版本号，用于版本比较触发更新弹窗
 * @property minVersion 最低支持版本，低于此版本的 APP 将被强制拦截
 * @property forceUpdate 是否强制更新（为 true 时用户只能选择更新，无法跳过）
 * @property downloadUrl APK 下载地址，APP 打开系统浏览器处理下载
 * @property notice 远程公告，非空时启动弹窗展示
 * @property debug 调试配置
 * @property featureFlags 功能开关集合，动态控制 AI/NewUI/LogUpload 等
 * @property experiments 实验功能配置，key-value 结构，预留扩展
 * @property grayscale 灰度配置，key-value 结构，预留按用户维度灰度
 */
data class RemoteConfig(
    val version: String = "",
    val minVersion: String = "",
    val forceUpdate: Boolean = false,
    val downloadUrl: String = "",
    val notice: NoticeConfig? = null,
    val debug: DebugConfig = DebugConfig(),
    val featureFlags: Map<String, Boolean> = emptyMap(),
    val experiments: Map<String, String> = emptyMap(),
    val grayscale: Map<String, String> = emptyMap()
) {
    companion object {
        /** 当所有源都失败且无本地缓存时使用的出厂默认配置 */
        val DEFAULT = RemoteConfig()
    }
}

/**
 * 远程公告配置。
 * 当 title 和 content 非空时，APP 启动后会弹窗展示。
 *
 * @property title 公告标题
 * @property content 公告正文（支持简略 Markdown 或纯文本）
 * @property link 可选跳转链接，用户点击"查看详情"时打开
 */
data class NoticeConfig(
    val title: String = "",
    val content: String = "",
    val link: String = ""
)

/**
 * 调试配置。
 *
 * @property enabled 是否开启调试模式
 * @property logLevel 日志级别：DEBUG / INFO / WARN / ERROR
 */
data class DebugConfig(
    val enabled: Boolean = false,
    val logLevel: String = "ERROR"
)

/**
 * 版本比较结果。
 */
enum class VersionCheckResult {
    /** 当前版本 >= 远程版本，无需更新 */
    UP_TO_DATE,

    /** 当前版本 < 远程版本，发现新版本 */
    NEW_VERSION_AVAILABLE,

    /** 当前版本 < 最低支持版本，必须更新 */
    BELOW_MIN_VERSION
}

/**
 * 配置获取结果封装。
 *
 * @param T 配置类型
 * @property data 成功时的配置数据
 * @property source 来源描述（如 "cache" / "cloudflare" / "vercel" / "default"）
 * @property error 失败时的异常信息
 */
sealed class ConfigResult<out T> {
    data class Success<T>(val data: T, val source: String) : ConfigResult<T>()
    data class Failure(val error: RemoteConfigException) : ConfigResult<Nothing>()
}

/**
 * 统一异常类型。
 * 所有 Remote Config 相关的异常均封装为此类型，避免因解析/网络/校验异常导致 APP 崩溃。
 */
sealed class RemoteConfigException(message: String, cause: Throwable? = null) : Exception(message, cause) {
    class NetworkException(message: String, cause: Throwable? = null) : RemoteConfigException(message, cause)
    class ParseException(message: String, cause: Throwable? = null) : RemoteConfigException(message, cause)
    class SecurityException(message: String, cause: Throwable? = null) : RemoteConfigException(message, cause)
    class CacheException(message: String, cause: Throwable? = null) : RemoteConfigException(message, cause)
    class SourceExhaustedException(message: String = "All sources failed") : RemoteConfigException(message)
}

/**
 * 配置变更监听器。
 * APP 可通过此接口接收配置刷新通知，动态调整 UI 和行为。
 */
fun interface ConfigChangeListener {
    fun onConfigChanged(newConfig: RemoteConfig, source: String)
}
