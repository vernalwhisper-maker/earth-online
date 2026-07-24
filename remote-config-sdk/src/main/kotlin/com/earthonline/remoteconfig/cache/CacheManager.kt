package com.earthonline.remoteconfig.cache

import com.earthonline.remoteconfig.core.RemoteConfigException
import com.earthonline.remoteconfig.log.Logger
import java.io.File

/**
 * 缓存管理器接口。
 * 负责将远程配置持久化到本地存储，以及从本地存储读取。
 * 默认实现使用文件系统，APP 可替换为 DataStore / SharedPreferences / MMKV 等。
 */
interface CacheManager {

    /**
     * 将 JSON 字符串缓存到本地。
     * @param key   缓存键（通常为 "remote_config"）
     * @param json  要缓存的 JSON 字符串
     */
    suspend fun save(key: String, json: String)

    /**
     * 从本地缓存读取 JSON 字符串。
     * @param key 缓存键
     * @return 缓存的 JSON 字符串，不存在时返回 null
     */
    suspend fun load(key: String): String?

    /**
     * 清除指定缓存。
     * @param key 缓存键
     */
    suspend fun clear(key: String)

    /**
     * 判断缓存是否存在。
     */
    suspend fun exists(key: String): Boolean
}

/**
 * [CacheManager] 的默认实现。
 * 使用应用内部存储的文件系统缓存。
 *
 * 缓存文件路径：{cacheDir}/remote_config/{key}.json
 * 不限制缓存大小，由 APP 自行管理。
 */
class FileCacheManager(
    private val cacheDir: File,
    private val logger: Logger = Logger()
) : CacheManager {

    private val cacheRoot: File get() = File(cacheDir, CACHE_DIR_NAME).also { it.mkdirs() }

    override suspend fun save(key: String, json: String) {
        try {
            val file = getCacheFile(key)
            file.parentFile?.mkdirs()
            file.writeText(json, Charsets.UTF_8)
            logger.d("FileCacheManager", "Cached: $key (${json.length} bytes)")
        } catch (e: Exception) {
            logger.e("FileCacheManager", "Save failed: $key", e)
            throw RemoteConfigException.CacheException("Failed to save cache: ${e.message}", e)
        }
    }

    override suspend fun load(key: String): String? {
        return try {
            val file = getCacheFile(key)
            if (file.exists()) {
                val text = file.readText(Charsets.UTF_8)
                logger.d("FileCacheManager", "Cache hit: $key (${text.length} bytes)")
                text
            } else {
                logger.d("FileCacheManager", "Cache miss: $key")
                null
            }
        } catch (e: Exception) {
            logger.e("FileCacheManager", "Load failed: $key", e)
            null // 缓存读取失败不抛异常，降级为无缓存
        }
    }

    override suspend fun clear(key: String) {
        try {
            val file = getCacheFile(key)
            if (file.exists()) file.delete()
            logger.d("FileCacheManager", "Cache cleared: $key")
        } catch (e: Exception) {
            logger.e("FileCacheManager", "Clear failed: $key", e)
        }
    }

    override suspend fun exists(key: String): Boolean {
        return getCacheFile(key).exists()
    }

    private fun getCacheFile(key: String): File {
        // 对 key 做安全处理，防止路径穿越
        val safeKey = key.replace(Regex("[^a-zA-Z0-9_\\-]"), "_")
        return File(cacheRoot, "$safeKey.json")
    }

    companion object {
        private const val CACHE_DIR_NAME = "remote_config"
        const val DEFAULT_CACHE_KEY = "remote_config"
    }
}
