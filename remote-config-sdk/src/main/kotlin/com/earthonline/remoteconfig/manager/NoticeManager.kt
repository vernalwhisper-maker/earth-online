package com.earthonline.remoteconfig.manager

import com.earthonline.remoteconfig.core.NoticeConfig
import com.earthonline.remoteconfig.core.RemoteConfig
import com.earthonline.remoteconfig.log.Logger

/**
 * 公告管理器。
 * 当远程配置中的 [NoticeConfig] 非空时，通知 APP 弹窗展示公告。
 */
class NoticeManager(private val logger: Logger = Logger()) {

    @Volatile
    private var currentConfig: RemoteConfig = RemoteConfig.DEFAULT

    /** 最后展示的公告内容哈希，避免重复弹窗 */
    @Volatile
    private var lastDisplayedNoticeHash: Int = 0

    /** 回调接口：当需要展示公告时通知 APP */
    @Volatile
    var onNoticeAvailable: ((NoticeConfig) -> Unit)? = null

    fun updateConfig(config: RemoteConfig) {
        currentConfig = config
        val notice = config.notice ?: return
        if (notice.title.isBlank() && notice.content.isBlank()) return

        val hash = notice.hashCode()
        if (hash != lastDisplayedNoticeHash) {
            lastDisplayedNoticeHash = hash
            logger.d("NoticeManager", "New notice: ${notice.title}")
            onNoticeAvailable?.invoke(notice)
        }
    }

    /** 获取当前公告配置 */
    fun getCurrentNotice(): NoticeConfig? = currentConfig.notice
}
