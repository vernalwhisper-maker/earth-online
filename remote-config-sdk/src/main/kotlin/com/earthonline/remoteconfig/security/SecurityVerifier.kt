package com.earthonline.remoteconfig.security

import com.earthonline.remoteconfig.core.RemoteConfigException
import com.earthonline.remoteconfig.log.Logger
import java.security.KeyFactory
import java.security.PublicKey
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.Base64

/**
 * 安全校验器接口。
 * 负责验证远程配置 JSON 的完整性和真实性，防止 DNS 劫持 / MITM / JSON 篡改。
 */
interface SecurityVerifier {

    /**
     * 校验 JSON 字符串的签名是否合法。
     * @param json         原始 JSON 字符串（未格式化的响应体）
     * @param signatureBase64 Base64 编码的签名（从响应头 X-Signature 或签名文件中获取）
     * @return true 签名合法 / false 签名不合法
     */
    fun verify(json: String, signatureBase64: String): Boolean
}

/**
 * [SecurityVerifier] 的默认实现。
 * 使用 RSA-2048 + SHA-256 签名方案。
 *
 * 安全模型：
 * 1. 开发者使用 RSA 私钥对 JSON 的 SHA-256 哈希签名
 * 2. 签名通过 HTTP 响应头 `X-Signature` 或独立签名文件传递
 * 3. APP 内置 RSA 公钥，验证签名
 * 4. 即使 DNS 被劫持或证书被伪造，攻击者无法伪造签名
 *
 * 公钥生成命令：
 * ```
 * openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048
 * openssl rsa -pubout -in private_key.pem -out public_key.pem
 * ```
 * 将 public_key.pem 的 Base64 内容（不含头尾标记和换行）设置为 [PUBLIC_KEY_BASE64]。
 *
 * 签名生成命令（更新 update.json 后执行）：
 * ```
 * openssl dgst -sha256 -sign private_key.pem -out update.json.sig update.json
 * base64 -w0 update.json.sig  # Linux/macOS
 * ```
 * 将 Base64 签名值设为 HTTP 响应头 `X-Signature: <value>`。
 */
class RsaSecurityVerifier(
    private val publicKeyBase64: String,
    private val logger: Logger = Logger()
) : SecurityVerifier {

    private val publicKey: PublicKey by lazy {
        try {
            val keyBytes = Base64.getDecoder().decode(publicKeyBase64)
            val keySpec = X509EncodedKeySpec(keyBytes)
            val keyFactory = KeyFactory.getInstance(KEY_ALGORITHM)
            keyFactory.generatePublic(keySpec)
        } catch (e: Exception) {
            throw IllegalStateException("Failed to load public key", e)
        }
    }

    override fun verify(json: String, signatureBase64: String): Boolean {
        return try {
            val signatureBytes = Base64.getDecoder().decode(signatureBase64)
            val signature = Signature.getInstance(SIGNATURE_ALGORITHM)
            signature.initVerify(publicKey)
            signature.update(json.toByteArray(Charsets.UTF_8))
            val result = signature.verify(signatureBytes)
            if (result) {
                logger.d("RsaSecurityVerifier", "Signature verification PASSED")
            } else {
                logger.w("RsaSecurityVerifier", "Signature verification FAILED")
            }
            result
        } catch (e: Exception) {
            logger.e("RsaSecurityVerifier", "Verification exception: ${e.message}", e)
            false
        }
    }

    companion object {
        const val KEY_ALGORITHM = "RSA"
        const val SIGNATURE_ALGORITHM = "SHA256withRSA"
    }
}

/**
 * 不执行校验的安全校验器（调试/开发环境使用）。
 * 生产环境中严禁使用。
 */
object InsecureVerifier : SecurityVerifier {
    override fun verify(json: String, signatureBase64: String): Boolean = true
}
