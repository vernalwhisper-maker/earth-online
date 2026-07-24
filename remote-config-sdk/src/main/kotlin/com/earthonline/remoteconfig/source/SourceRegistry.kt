package com.earthonline.remoteconfig.source

import com.earthonline.remoteconfig.core.ConfigResult
import com.earthonline.remoteconfig.core.RemoteConfig
import com.earthonline.remoteconfig.core.RemoteConfigException
import com.earthonline.remoteconfig.log.Logger

/**
 * 多源容灾调度器。
 * 按优先级依次请求所有注册的 Source，直到第一个成功响应为止。
 * 所有 Source 失败后返回 [ConfigResult.Failure]。
 *
 * 新增 Source 只需调用 [register] 方法，符合开闭原则（OCP）。
 * 框架内置三个 Source，APP 可在初始化时额外注册更多 Source。
 */
class SourceRegistry(private val logger: Logger = Logger()) {

    private val sources = mutableListOf<RemoteConfigSource>()

    /**
     * 注册一个配置源。
     * 支持链式调用。
     */
    fun register(source: RemoteConfigSource): SourceRegistry {
        sources.add(source)
        // 按优先级排序（数字小优先）
        sources.sortBy { it.priority }
        logger.d("SourceRegistry", "Registered source: ${source.name} (priority=${source.priority})")
        return this
    }

    /**
     * 批量注册配置源。
     */
    fun registerAll(vararg sources: RemoteConfigSource): SourceRegistry {
        sources.forEach { register(it) }
        return this
    }

    /**
     * 获取当前所有已注册的源列表（按优先级排序）。
     */
    fun getSources(): List<RemoteConfigSource> = sources.toList()

    /**
     * 依次尝试所有源，返回第一个成功获取的 JSON 字符串。
     * 全部失败时返回 [ConfigResult.Failure]。
     */
    suspend fun fetchWithFailover(): ConfigResult<String> {
        if (sources.isEmpty()) {
            return ConfigResult.Failure(
                RemoteConfigException.SourceExhaustedException("No sources registered")
            )
        }

        val errors = mutableListOf<String>()

        for (source in sources) {
            logger.d("SourceRegistry", "Trying source: ${source.name} (${source.url})")
            when (val result = source.fetchRawJson()) {
                is ConfigResult.Success -> {
                    logger.d("SourceRegistry", "Success from ${source.name}")
                    return result
                }
                is ConfigResult.Failure -> {
                    val msg = "${source.name}: ${result.error.message}"
                    errors.add(msg)
                    logger.w("SourceRegistry", "Failed: $msg")
                }
            }
        }

        val summary = "All sources failed: ${errors.joinToString("; ")}"
        logger.e("SourceRegistry", summary)
        return ConfigResult.Failure(
            RemoteConfigException.SourceExhaustedException(summary)
        )
    }
}
