package com.earthonline.remoteconfig.manager

import com.earthonline.remoteconfig.core.RemoteConfig
import com.earthonline.remoteconfig.log.Logger

/**
 * 功能开关管理器。
 * 负责动态读取 [RemoteConfig.featureFlags] 中的开关状态。
 *
 * APP 中所有需要远程控制的 Feature Flag 都通过此管理器查询。
 * 新增 Flag 不需要修改此管理器，直接按名称查询即可。
 *
 * 使用示例：
 * ```
 * if (featureManager.isEnabled("AI")) {
 *     showAIAssistant()
 * }
 * ```
 */
class FeatureManager(private val logger: Logger = Logger()) {

    @Volatile
    private var currentConfig: RemoteConfig = RemoteConfig.DEFAULT

    /**
     * 更新内部持有的配置引用。
     * 由 [RemoteConfigManager] 在每次成功刷新后调用。
     */
    fun updateConfig(config: RemoteConfig) {
        currentConfig = config
        logger.d("FeatureManager", "Flags updated: ${config.featureFlags}")
    }

    /**
     * 查询指定功能开关是否启用。
     * 当 Flag 不存在时返回 false。
     *
     * @param flagName 功能开关名称（如 "AI", "NewUI", "LogUpload"）
     */
    fun isEnabled(flagName: String): Boolean {
        return currentConfig.featureFlags[flagName] ?: false
    }

    /**
     * 获取所有功能开关的只读快照。
     */
    fun getAllFlags(): Map<String, Boolean> = currentConfig.featureFlags.toMap()

    /**
     * 获取原始配置引用（供其他管理器使用）。
     */
    fun getRawConfig(): RemoteConfig = currentConfig
}
