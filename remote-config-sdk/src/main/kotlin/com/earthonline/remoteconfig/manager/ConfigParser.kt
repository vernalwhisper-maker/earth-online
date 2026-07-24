package com.earthonline.remoteconfig.manager

import com.earthonline.remoteconfig.core.RemoteConfig
import com.earthonline.remoteconfig.core.RemoteConfigException
import com.earthonline.remoteconfig.log.Logger
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.decodeFromDynamic
import kotlinx.serialization.json.jsonObject

/**
 * JSON 解析器。
 * 负责将原始 JSON 字符串解析为 [RemoteConfig] 对象。
 * 使用 kotlinx.serialization 的宽松模式（isLenient = true, ignoreUnknownKeys = true），
 * 确保新增字段不会导致解析失败，字段类型变化时使用默认值兜底。
 *
 * 解析策略：
 * 1. 先解析为 JsonObject 确认顶级结构
 * 2. 逐字段提取，缺失字段使用默认值
 * 3. 类型不匹配时捕获异常，使用默认值
 * 4. 整个解析过程不抛出异常
 */
class ConfigParser(private val logger: Logger = Logger()) {

    private val json = Json {
        isLenient = true
        ignoreUnknownKeys = true
        coerceInputValues = true
        encodeDefaults = true
    }

    /**
     * 将 JSON 字符串解析为 [RemoteConfig]。
     * 解析失败时返回 [RemoteConfig.DEFAULT] 且不抛异常。
     *
     * @return 解析后的 RemoteConfig，失败时返回默认配置
     */
    fun parse(rawJson: String): RemoteConfig {
        return try {
            val root = json.parseToJsonElement(rawJson).jsonObject
            val config = RemoteConfig(
                version = root.safeString("version"),
                minVersion = root.safeString("minVersion"),
                forceUpdate = root.safeBoolean("forceUpdate"),
                downloadUrl = root.safeString("downloadUrl") ?: root.safeString("download"),
                notice = parseNotice(root),
                debug = parseDebug(root),
                featureFlags = parseFeatureFlags(root),
                experiments = safeJsonObject(root, "experiments")?.let { obj ->
                    obj.mapValues { it.value.toString().trim('"') }
                } ?: emptyMap(),
                grayscale = safeJsonObject(root, "grayscale")?.let { obj ->
                    obj.mapValues { it.value.toString().trim('"') }
                } ?: emptyMap()
            )
            logger.d("ConfigParser", "Parsed config: version=${config.version}")
            config
        } catch (e: Exception) {
            logger.e("ConfigParser", "Parse failed, using defaults: ${e.message}", e)
            RemoteConfig.DEFAULT
        }
    }

    private fun parseNotice(root: JsonObject): com.earthonline.remoteconfig.core.NoticeConfig? {
        val noticeObj = safeJsonObject(root, "notice") ?: return null
        // 兼容 notice 为字符串的旧格式
        if (noticeObj.isEmpty() && root.containsKey("notice")) {
            val text = root.safeString("notice")
            if (text.isNotBlank()) {
                return com.earthonline.remoteconfig.core.NoticeConfig(
                    title = "公告",
                    content = text
                )
            }
            return null
        }
        val title = noticeObj.safeString("title")
        val content = noticeObj.safeString("content")
        if (title.isBlank() && content.isBlank()) return null
        return com.earthonline.remoteconfig.core.NoticeConfig(
            title = title,
            content = content,
            link = noticeObj.safeString("link")
        )
    }

    private fun parseDebug(root: JsonObject): com.earthonline.remoteconfig.core.DebugConfig {
        val debugObj = safeJsonObject(root, "debug") ?: return com.earthonline.remoteconfig.core.DebugConfig()
        // 兼容 debug 为布尔值的旧格式
        if (debugObj.isEmpty() && root.containsKey("debug")) {
            val enabled = root.safeBoolean("debug")
            return com.earthonline.remoteconfig.core.DebugConfig(enabled = enabled)
        }
        return com.earthonline.remoteconfig.core.DebugConfig(
            enabled = debugObj.safeBoolean("enabled"),
            logLevel = debugObj.safeString("logLevel").ifBlank { "ERROR" }
        )
    }

    private fun parseFeatureFlags(root: JsonObject): Map<String, Boolean> {
        val flagsObj = safeJsonObject(root, "featureFlags") ?: return emptyMap()
        return flagsObj.mapValues { (_, value) ->
            try { value.toString().toBooleanStrict() } catch (_: Exception) { false }
        }
    }

    private fun JsonObject.safeString(key: String): String {
        return try { this[key]?.toString()?.trim('"') ?: "" } catch (_: Exception) { "" }
    }

    private fun JsonObject.safeBoolean(key: String): Boolean {
        return try { this[key]?.toString()?.toBooleanStrict() ?: false } catch (_: Exception) { false }
    }

    private fun safeJsonObject(root: JsonObject, key: String): JsonObject? {
        return try { root[key]?.jsonObject } catch (_: Exception) { null }
    }
}
