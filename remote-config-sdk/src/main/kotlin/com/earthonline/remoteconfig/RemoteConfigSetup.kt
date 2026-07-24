/**
 * Remote Config SDK 部署配置。
 * 将此类集成到 Android 项目的 Application.onCreate() 中。
 *
 * Cloudflare Pages: https://a196e19f.earth-online-6zb.pages.dev/update.json
 * Vercel:          https://earth-online-cx9t5unhi-vernal.vercel.app/update.json
 * jsDelivr:        https://cdn.jsdelivr.net/gh/vernalwhisper-maker/earth-online@main/public/update.json
 * GitHub Raw:      https://raw.githubusercontent.com/vernalwhisper-maker/earth-online/main/public/update.json
 */
object RemoteConfigSetup {

    /** RSA-2048 公钥（Base64，单行，不含头尾标记），用于验证 update.json 签名 */
    private const val PUBLIC_KEY_BASE64 =
        "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwOZOwl7jEgaMBT7cJ6SkI8ysZJTIWBfowc1LXssNV1q0ARyxSkJr380oR5NkleerBn5HUAGjV5j439fVEu5fO3atofUovV5DsHizYmP0r/IJi4w1Tso6fYOKF1jC844Eq/fJhU53eOGEZCM8ykRry1sUp7I7ssIVn7gi29GJOcXzhN6vSmEqLrsPax253rg+XGge/PHE8C81eDgpnghB5uqpddOWf88mPqhXwyYp2XT2a6MlmtUe4Bwg/Vd0gI41kNtBUAdUlICFjeKcwm6HlZcdkHN5CM4qWDFD1fmI1Zd3fYn87eziyA9oBByOERhJ3820n4H2HdMKWW1MGqwuLwIDAQAB"

    fun build(): RemoteConfigManager {
        return RemoteConfigManager.Builder()
            .setCurrentVersion(BuildConfig.VERSION_NAME)
            .setPublicKey(PUBLIC_KEY_BASE64)
            // Source 1: Cloudflare Pages（中国大陆访问最快）
            .addSource(HttpRemoteConfigSource(
                name = "cloudflare",
                url = "https://a196e19f.earth-online-6zb.pages.dev/update.json",
                priority = 0
            ))
            // Source 2: Vercel
            .addSource(HttpRemoteConfigSource(
                name = "vercel",
                url = "https://earth-online-cx9t5unhi-vernal.vercel.app/update.json",
                priority = 1
            ))
            // Source 3: jsDelivr CDN（基于 GitHub）
            .addSource(HttpRemoteConfigSource(
                name = "jsdelivr",
                url = "https://cdn.jsdelivr.net/gh/vernalwhisper-maker/earth-online@main/public/update.json",
                priority = 2
            ))
            // Source 4: GitHub Raw（兜底）
            .addSource(HttpRemoteConfigSource(
                name = "github-raw",
                url = "https://raw.githubusercontent.com/vernalwhisper-maker/earth-online/main/public/update.json",
                priority = 3
            ))
            .setDebug(BuildConfig.DEBUG)
            .setOnVersionCheckListener { result, config ->
                when (result) {
                    VersionCheckResult.BELOW_MIN_VERSION -> {
                        // 弹窗：必须更新
                        showForceUpdateDialog(config)
                    }
                    VersionCheckResult.NEW_VERSION_AVAILABLE -> {
                        showUpdateDialog(config)
                    }
                    VersionCheckResult.UP_TO_DATE -> { /* 无需操作 */ }
                }
            }
            .build()
    }
}
