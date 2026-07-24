package com.earthonline.remoteconfig.source

import com.earthonline.remoteconfig.core.ConfigResult
import com.earthonline.remoteconfig.core.RemoteConfigException
import com.earthonline.remoteconfig.network.HttpFetcher
import kotlinx.serialization.Serializable

/**
 * 基于 URL 的通用远程配置源。
 * 只需提供 URL 和名称即可创建一个可用的 Source。
 * 支持 ETag 条件请求减少重复下载。
 *
 * @param overrideName 源名称，用于日志标识
 * @param overrideUrl  配置文件的 HTTPS URL
 * @param overridePriority 优先级（0=最高）
 * @param httpFetcher  HTTP 请求执行器，允许注入 Mock 用于测试
 */
class HttpRemoteConfigSource(
    override val name: String,
    override val url: String,
    override val priority: Int,
    private val httpFetcher: HttpFetcher = HttpFetcher.Default
) : RemoteConfigSource {

    /** 本地缓存的 ETag，用于条件请求 */
    private var cachedEtag: String? = null

    /** 本地缓存的响应体，配合 ETag 使用 */
    private var cachedBody: String? = null

    override suspend fun fetchRawJson(): ConfigResult<String> {
        return try {
            val response = httpFetcher.get(url, cachedEtag)
            when (response.statusCode) {
                304 -> {
                    // Not Modified — 使用本地缓存的上次有效响应
                    cachedBody?.let {
                        ConfigResult.Success(it, name)
                    } ?: ConfigResult.Failure(
                        RemoteConfigException.NetworkException("304 without cached body")
                    )
                }
                in 200..299 -> {
                    cachedEtag = response.etag
                    cachedBody = response.body
                    ConfigResult.Success(response.body, name)
                }
                else -> ConfigResult.Failure(
                    RemoteConfigException.NetworkException("HTTP ${response.statusCode} from $name")
                )
            }
        } catch (e: Exception) {
            ConfigResult.Failure(
                RemoteConfigException.NetworkException("Failed to fetch from $name: ${e.message}", e)
            )
        }
    }
}

/**
 * 预置的 Source 工厂。
 * 提供 Cloudflare Pages、Vercel、jsDelivr 三个开箱即用的源。
 *
 * 使用前需替换 YOUR_* 占位符为实际值。
 */
object PresetSources {

    /**
     * Cloudflare Pages 源。
     * 部署：将 update.json 放入 Cloudflare Pages 项目根目录，自动部署。
     * 域名：`https://<project>.pages.dev/update.json`
     * 优势：中国大陆访问速度较好，免费额度充足。
     */
    fun cloudflare(pagesProject: String, filename: String = "update.json"): HttpRemoteConfigSource {
        return HttpRemoteConfigSource(
            name = "cloudflare",
            url = "https://$pagesProject.pages.dev/$filename",
            priority = 0
        )
    }

    /**
     * Vercel 源。
     * 部署：将 update.json 放入 Vercel 项目 `public/` 目录。
     * 域名：`https://<project>.vercel.app/update.json`
     * 优势：全球 CDN，免费额度充足。
     */
    fun vercel(projectName: String, filename: String = "update.json"): HttpRemoteConfigSource {
        return HttpRemoteConfigSource(
            name = "vercel",
            url = "https://$projectName.vercel.app/$filename",
            priority = 1
        )
    }

    /**
     * GitHub + jsDelivr CDN 源。
     * 部署：将 update.json 提交到 GitHub 仓库任意分支。
     * URL 格式：`https://cdn.jsdelivr.net/gh/<user>/<repo>@<branch>/update.json`
     * 优势：jsDelivr 是中国大陆可访问的 CDN，GitHub 作为源管理方便。
     */
    fun jsDelivr(githubUser: String, githubRepo: String, branch: String = "main", filename: String = "update.json"): HttpRemoteConfigSource {
        return HttpRemoteConfigSource(
            name = "jsdelivr",
            url = "https://cdn.jsdelivr.net/gh/$githubUser/$githubRepo@$branch/$filename",
            priority = 2
        )
    }

    /**
     * 原始 GitHub raw 源（兜底）。
     * jsDelivr 可能比 GitHub raw 更快，但 raw.githubusercontent.com 作为备选。
     */
    fun githubRaw(githubUser: String, githubRepo: String, branch: String = "main", filename: String = "update.json"): HttpRemoteConfigSource {
        return HttpRemoteConfigSource(
            name = "github-raw",
            url = "https://raw.githubusercontent.com/$githubUser/$githubRepo/$branch/$filename",
            priority = 3
        )
    }
}

/**
 * 请求响应封装。
 */
@Serializable
data class HttpResponse(
    val statusCode: Int,
    val body: String,
    val etag: String? = null
)
