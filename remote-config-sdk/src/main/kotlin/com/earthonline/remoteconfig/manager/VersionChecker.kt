package com.earthonline.remoteconfig.manager

import com.earthonline.remoteconfig.core.RemoteConfig
import com.earthonline.remoteconfig.core.VersionCheckResult
import com.earthonline.remoteconfig.log.Logger

/**
 * 版本检查器。
 * 负责比较当前 APP 版本与远程配置中的版本号。
 *
 * 版本号比较规则：按语义化版本（SemVer）逐段比较。
 * 如果版本号不符合 SemVer 格式，则按字符串字典序比较。
 */
class VersionChecker(private val logger: Logger = Logger()) {

    /**
     * 检查当前版本是否需要更新。
     *
     * @param currentVersion 当前 APP 版本号（如 "1.2.3"）
     * @param config         远程配置
     * @return [VersionCheckResult] 检查结果
     */
    fun check(currentVersion: String, config: RemoteConfig): VersionCheckResult {
        if (config.minVersion.isNotBlank() && compareVersions(currentVersion, config.minVersion) < 0) {
            logger.d("VersionChecker", "Below min version: $currentVersion < ${config.minVersion}")
            return VersionCheckResult.BELOW_MIN_VERSION
        }

        if (config.version.isNotBlank() && compareVersions(currentVersion, config.version) < 0) {
            logger.d("VersionChecker", "New version available: $currentVersion < ${config.version}")
            return VersionCheckResult.NEW_VERSION_AVAILABLE
        }

        return VersionCheckResult.UP_TO_DATE
    }

    /**
     * 比较两个版本号。
     * @return 负数 a<b, 0 a=b, 正数 a>b
     */
    private fun compareVersions(a: String, b: String): Int {
        val partsA = parseVersion(a)
        val partsB = parseVersion(b)
        val maxLen = maxOf(partsA.size, partsB.size)
        for (i in 0 until maxLen) {
            val va = partsA.getOrElse(i) { 0 }
            val vb = partsB.getOrElse(i) { 0 }
            if (va != vb) return va - vb
        }
        return 0
    }

    /**
     * 将版本号解析为整数数组。
     * "1.2.3" → [1, 2, 3]
     * "1.2.3-beta" → [1, 2, 3]  （忽略预发布标签）
     */
    private fun parseVersion(version: String): List<Int> {
        return try {
            val clean = version.split("-").first()
            clean.split(".").map { it.toIntOrNull() ?: 0 }
        } catch (_: Exception) {
            listOf(0)
        }
    }
}
