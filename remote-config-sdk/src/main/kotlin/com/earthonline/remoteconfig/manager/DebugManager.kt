package com.earthonline.remoteconfig.manager

import com.earthonline.remoteconfig.core.RemoteConfig
import com.earthonline.remoteconfig.log.Logger

/**
 * 调试管理器。
 * 根据远程配置的 [DebugConfig] 控制 APP 的调试行为。
 *
 * 当 remote debug.enabled = true 时：
 * 1. 开启详细日志输出
 * 2. 开启开发者调试菜单
 * 3. 开启开发者选项入口
 */
class DebugManager(private val logger: Logger = Logger()) {

    @Volatile
    private var currentConfig: RemoteConfig = RemoteConfig.DEFAULT

    /** 回调接口：当调试状态变化时通知 APP */
    @Volatile
    var onDebugStateChanged: ((isDebug: Boolean) -> Unit)? = null

    fun updateConfig(config: RemoteConfig) {
        val wasDebug = currentConfig.debug.enabled
        currentConfig = config
        val nowDebug = config.debug.enabled

        if (wasDebug != nowDebug) {
            logger.d("DebugManager", "Debug mode changed: $wasDebug → $nowDebug")
            onDebugStateChanged?.invoke(nowDebug)
        }
    }

    /** 远程配置是否开启了调试模式 */
    fun isDebugEnabled(): Boolean = currentConfig.debug.enabled

    /** 获取远程配置的日志级别 */
    fun getLogLevel(): String = currentConfig.debug.logLevel
}
