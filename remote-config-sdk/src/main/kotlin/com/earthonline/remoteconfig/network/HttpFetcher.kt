package com.earthonline.remoteconfig.network

import com.earthonline.remoteconfig.source.HttpResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.zip.GZIPInputStream

/**
 * HTTP 请求执行器接口。
 * 允许在单元测试中注入 Mock 实现，不依赖真实网络。
 */
fun interface HttpFetcher {

    /**
     * 执行 HTTPS GET 请求。
     * @param url        请求地址（必须是 HTTPS）
     * @param etag       可选 ETag，用于条件请求（If-None-Match）
     * @return [HttpResponse] 包含状态码、响应体、ETag
     * @throws IllegalArgumentException 如果 url 不是 HTTPS
     * @throws Exception 网络异常时抛出
     */
    suspend fun get(url: String, etag: String? = null): HttpResponse

    companion object {
        /** 默认实现，基于 [HttpURLConnection] */
        val Default: HttpFetcher = DefaultHttpFetcher()
    }
}

/**
 * [HttpFetcher] 的默认实现。
 * 使用 Java 标准库 [HttpURLConnection]，无第三方依赖。
 *
 * 特性：
 * - 连接超时 3 秒
 * - 读取超时 3 秒
 * - HTTPS ONLY
 * - 支持 GZIP 解压缩
 * - 支持 ETag 条件请求（If-None-Match / ETag 响应头）
 * - 自动跟随重定向
 */
class DefaultHttpFetcher : HttpFetcher {

    override suspend fun get(url: String, etag: String?): HttpResponse = withContext(Dispatchers.IO) {
        require(url.startsWith("https://")) { "HTTPS ONLY: $url" }

        val connection = URL(url).openConnection() as HttpURLConnection
        connection.apply {
            connectTimeout = CONNECT_TIMEOUT_MS
            readTimeout = READ_TIMEOUT_MS
            instanceFollowRedirects = true
            setRequestProperty("User-Agent", USER_AGENT)
            setRequestProperty("Accept-Encoding", "gzip")
            etag?.let { setRequestProperty("If-None-Match", it) }
        }

        try {
            connection.connect()
            val statusCode = connection.responseCode
            val responseEtag = connection.getHeaderField("ETag")

            when (statusCode) {
                HttpURLConnection.HTTP_NOT_MODIFIED -> {
                    HttpResponse(statusCode = 304, body = "", etag = responseEtag)
                }
                in 200..299 -> {
                    val body = readBody(connection)
                    HttpResponse(statusCode = statusCode, body = body, etag = responseEtag)
                }
                else -> {
                    val errorBody = try {
                        readBody(connection)
                    } catch (_: Exception) { "" }
                    throw NetworkException("HTTP $statusCode: $errorBody")
                }
            }
        } catch (e: java.net.SocketTimeoutException) {
            throw NetworkException("Timeout: $url", e)
        } catch (e: Exception) {
            throw NetworkException("${e::class.simpleName}: ${e.message}", e)
        } finally {
            connection.disconnect()
        }
    }

    private fun readBody(connection: HttpURLConnection): String {
        val inputStream = connection.inputStream
        val encoding = connection.getContentEncoding()
        val reader = if ("gzip".equals(encoding, ignoreCase = true)) {
            BufferedReader(InputStreamReader(GZIPInputStream(inputStream), Charsets.UTF_8))
        } else {
            BufferedReader(InputStreamReader(inputStream, Charsets.UTF_8))
        }
        return reader.use { it.readText() }
    }
}

/**
 * 网络异常（与 RemoteConfigException 解耦，便于迁移）。
 */
class NetworkException(message: String, cause: Throwable? = null) : Exception(message, cause)

private const val CONNECT_TIMEOUT_MS = 3000
private const val READ_TIMEOUT_MS = 3000
private const val USER_AGENT = "RemoteConfigSDK/1.0"
