package com.earthonline.remoteconfig.source

import com.earthonline.remoteconfig.core.ConfigResult
import com.earthonline.remoteconfig.core.RemoteConfig

/**
 * 远程配置源接口。
 * 每个 Source 代表一个可独立获取 RemoteConfig 的地址。
 * 新增 Source 只需实现此接口并在 [SourceRegistry] 中注册，无需修改核心逻辑（OCP）。
 *
 * 实现类必须：
 * 1. 只发起一次 HTTPS GET 请求
 * 2. 设置连接超时 3s、读取超时 3s
 * 3. 不自行解析 JSON（由上层处理）
 * 4. 返回原始 JSON 字符串而非解析后的对象
 */
interface RemoteConfigSource {

    /** 源的唯一标识，用于日志和调试 */
    val name: String

    /** 获取配置的完整 URL（HTTPS ONLY） */
    val url: String

    /** 优先级，数字越小越优先（0 为最高优先级） */
    val priority: Int

    /**
     * 从该源获取原始 JSON 字符串。
     * @return 包含 JSON 字符串的 [ConfigResult.Success]，或包含错误的 [ConfigResult.Failure]
     */
    suspend fun fetchRawJson(): ConfigResult<String>
}
