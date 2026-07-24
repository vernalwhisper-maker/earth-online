package com.earthonline.remoteconfig.log

/**
 * 统一日志工具。
 * 调试模式（isDebug = true）输出全部级别日志。
 * 正式模式仅输出 ERROR 级别。
 *
 * 可替换为第三方日志库（如 Timber、Logcat），只需修改此类的内部实现。
 */
class Logger(private val isDebug: Boolean = false) {

    /** 日志级别 */
    enum class Level { DEBUG, INFO, WARN, ERROR }

    fun d(tag: String, msg: String) {
        if (isDebug) println("[D][$tag] $msg")
    }

    fun i(tag: String, msg: String) {
        if (isDebug) println("[I][$tag] $msg")
    }

    fun w(tag: String, msg: String) {
        if (isDebug) println("[W][$tag] $msg")
    }

    fun e(tag: String, msg: String, throwable: Throwable? = null) {
        println("[E][$tag] $msg")
        throwable?.let { it.printStackTrace() }
    }

    /** 创建一个副本并修改调试级别 */
    fun withDebug(debug: Boolean): Logger = Logger(debug)
}
