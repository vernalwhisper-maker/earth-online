/**
 * 地球Online Remote Config — PWA 版
 * ====================================
 * 零服务器、多源容灾的远程配置系统。
 * 纯前端实现，无框架依赖，可直接在浏览器/PWA 中使用。
 *
 * ## 使用示例
 * ```js
 * import { createRemoteConfig } from './utils/remoteConfig';
 *
 * const config = createRemoteConfig({
 *   currentVersion: '1.4.0',
 *   publicKeyPem: '...',  // RSA 公钥 PEM
 *   sources: [
 *     { name: 'cloudflare', url: 'https://earth-online-config.pages.dev/update.json' },
 *     { name: 'vercel',     url: 'https://earth-online-opal.vercel.app/update.json' },
 *     { name: 'jsdelivr',   url: 'https://cdn.jsdelivr.net/gh/vernalwhisper-maker/earth-online@main/public/update.json' },
 *   ]
 * });
 *
 * // 启动（自动读缓存 + 后台刷新）
 * config.start();
 *
 * // 监听配置变更
 * config.onUpdate(() => { ... });
 *
 * // 检查功能开关
 * if (config.isFeatureEnabled('AI')) { ... }
 * ```
 *
 * @module remoteConfig
 */

// ============================================================
// 常量
// ============================================================

const CACHE_KEY = 'earth-online-remote-config';
const CONNECT_TIMEOUT = 3000;
const READ_TIMEOUT = 3000;

// ============================================================
// 日志
// ============================================================

const logger = {
  debug: false,
  d(...args) { if (this.debug) console.log('[RemoteConfig]', ...args); },
  i(...args) { if (this.debug) console.info('[RemoteConfig]', ...args); },
  w(...args) { console.warn('[RemoteConfig]', ...args); },
  e(...args) { console.error('[RemoteConfig]', ...args); },
};

// ============================================================
// 工具函数
// ============================================================

/** 语义化版本比较：a<b → 负数, a=b → 0, a>b → 正数 */
function compareVersions(a, b) {
  const parse = (v) => (v || '0.0.0').split('-')[0].split('.').map(Number);
  const pa = parse(a), pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] || 0, vb = pb[i] || 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

/** 返回当前环境是否深色模式 */
function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

// ============================================================
// 网络请求
// ============================================================

async function fetchWithTimeout(url, timeoutMs = CONNECT_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'default',
      headers: { 'Accept-Encoding': 'gzip' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { body: await response.text(), etag: response.headers.get('ETag') };
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// 多源容灾调度器
// ============================================================

class SourceFetcher {
  constructor(sources) {
    this.sources = sources;
  }

  async fetchWithFailover() {
    const errors = [];
    for (const src of this.sources) {
      try {
        logger.d(`Fetching from ${src.name}...`);
        const { body } = await fetchWithTimeout(src.url);
        logger.i(`✓ ${src.name} responded`);
        return { json: body, source: src.name };
      } catch (err) {
        errors.push(`${src.name}: ${err.message}`);
        logger.w(`✗ ${src.name}: ${err.message}`);
      }
    }
    throw new Error('All sources failed: ' + errors.join('; '));
  }
}

// ============================================================
// 签名校验（Web Crypto API）
// ============================================================

class SignatureVerifier {
  constructor(publicKeyPem) {
    this.publicKeyPem = publicKeyPem;
    this.publicKey = null;
  }

  async init() {
    if (this.publicKey) return;
    const pemHeader = '-----BEGIN PUBLIC KEY-----';
    const pemFooter = '-----END PUBLIC KEY-----';
    const pemContents = this.publicKeyPem
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '');
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    this.publicKey = await crypto.subtle.importKey(
      'spki', binaryDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false, ['verify']
    );
  }

  async verify(jsonString, signatureBase64) {
    try {
      await this.init();
      const signature = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
      const data = new TextEncoder().encode(jsonString);
      const result = await crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' }, this.publicKey, signature, data
      );
      logger.d(result ? 'Signature OK' : 'Signature MISMATCH');
      return result;
    } catch (err) {
      logger.e('Signature verification error:', err);
      return false;
    }
  }
}

// ============================================================
// 配置解析器
// ============================================================

const DEFAULT_CONFIG = Object.freeze({
  version: '',
  minVersion: '',
  forceUpdate: false,
  downloadUrl: '',
  notice: null,
  debug: { enabled: false, logLevel: 'ERROR' },
  featureFlags: {},
  experiments: {},
  grayscale: {},
});

function parseConfig(rawJson) {
  try {
    const data = JSON.parse(rawJson);
    return {
      version: String(data.version || ''),
      minVersion: String(data.minVersion || ''),
      forceUpdate: Boolean(data.forceUpdate),
      downloadUrl: String(data.downloadUrl || data.download || ''),
      notice: data.notice
        ? (typeof data.notice === 'string'
          ? { title: '公告', content: data.notice, link: '' }
          : { title: String(data.notice.title || ''), content: String(data.notice.content || ''), link: String(data.notice.link || '') })
        : null,
      debug: data.debug
        ? (typeof data.debug === 'boolean'
          ? { enabled: data.debug, logLevel: 'ERROR' }
          : { enabled: Boolean(data.debug.enabled), logLevel: String(data.debug.logLevel || 'ERROR') })
        : { ...DEFAULT_CONFIG.debug },
      featureFlags: data.featureFlags ? Object.fromEntries(
        Object.entries(data.featureFlags).map(([k, v]) => [k, Boolean(v)])
      ) : {},
      experiments: data.experiments || {},
      grayscale: data.grayscale || {},
    };
  } catch (err) {
    logger.e('Parse failed, using defaults:', err);
    return { ...DEFAULT_CONFIG };
  }
}

// ============================================================
// 缓存管理器（localStorage）
// ============================================================

class CacheManager {
  get() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  set(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
  }

  clear() {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
  }
}

// ============================================================
// Remote Config 主入口
// ============================================================

/**
 * 创建 Remote Config 实例。
 *
 * @param {Object} options
 * @param {string} options.currentVersion - 当前 APP 版本号
 * @param {string} [options.publicKeyPem] - RSA 公钥 PEM（为空则跳过校验）
 * @param {Array<{name:string, url:string}>} options.sources - 配置源列表（按优先级）
 * @param {boolean} [options.debug] - 调试日志
 * @param {Function} [options.onVersionCheck] - 版本检查回调 (checkResult, config)
 * @param {Function} [options.onNotice] - 公告回调 (notice)
 * @param {Function} [options.onConfigChange] - 配置变更回调 (config, source)
 * @returns {RemoteConfigInstance}
 */
export function createRemoteConfig(options) {
  return new RemoteConfigInstance(options);
}

class RemoteConfigInstance {
  constructor(opts) {
    this.currentVersion = opts.currentVersion || '0.0.0';
    this.publicKeyPem = opts.publicKeyPem || '';
    this.sources = opts.sources || [];
    logger.debug = Boolean(opts.debug);

    this.fetcher = new SourceFetcher(this.sources);
    this.verifier = this.publicKeyPem ? new SignatureVerifier(this.publicKeyPem) : null;
    this.cache = new CacheManager();

    // 回调
    this._onVersionCheck = opts.onVersionCheck || null;
    this._onNotice = opts.onNotice || null;
    this._onConfigChange = opts.onConfigChange || null;
    this._onDebugChange = opts.onDebugChange || null;
    this._listeners = [];

    // 当前配置
    this.config = { ...DEFAULT_CONFIG };
  }

  // ---- 启动 ----

  start() {
    logger.d('Starting Remote Config...');

    // 1. 读缓存
    const cached = this.cache.get();
    if (cached) {
      logger.d('Cache hit, applying...');
      this._apply(cached.config || DEFAULT_CONFIG, 'cache');
    }

    // 2. 后台刷新
    this._refresh().catch(() => {});
  }

  // ---- 公共 API ----

  /** 手动触发刷新 */
  refresh() { this._refresh().catch(() => {}); }

  /** 监听配置变更 */
  onUpdate(fn) { this._listeners.push(fn); }

  /** 查询功能开关 */
  isFeatureEnabled(name) {
    return Boolean(this.config.featureFlags[name]);
  }

  /** 获取所有功能开关 */
  getAllFeatures() { return { ...this.config.featureFlags }; }

  /** 是否调试模式 */
  isDebugEnabled() { return this.config.debug.enabled; }

  /** 获取实验参数 */
  getExperiment(key, fallback = null) {
    return this.config.experiments[key] ?? fallback;
  }

  /** 获取灰度参数 */
  getGrayscale(key, fallback = null) {
    return this.config.grayscale[key] ?? fallback;
  }

  // ---- 内部 ----

  async _refresh() {
    logger.d('Refreshing from remote...');
    try {
      const { json, source } = await this.fetcher.fetchWithFailover();

      // 签名校验
      if (this.verifier) {
        const parsed = JSON.parse(json);
        const signature = parsed._signature;
        if (signature) {
          delete parsed._signature;
          const cleanJson = JSON.stringify(parsed, null, 2) + '\n';
          const valid = await this.verifier.verify(cleanJson, signature);
          if (!valid) {
            logger.w('Signature verification failed, keeping cached config');
            return;
          }
        } else {
          logger.w('No signature found in config');
        }
      }

      const config = parseConfig(json);
      this._apply(config, source);

      // 缓存
      this.cache.set({ config, updatedAt: Date.now() });

      // 版本检查
      this._runVersionCheck(config);

    } catch (err) {
      logger.w('Refresh failed:', err.message);
    }
  }

  _apply(config, source) {
    const oldDebug = this.config.debug.enabled;
    this.config = config;

    // 通知
    this._listeners.forEach(fn => fn(config, source));
    this._onConfigChange?.(config, source);

    // 调试状态变化
    if (config.debug.enabled !== oldDebug) {
      this._onDebugChange?.(config.debug.enabled);
    }

    // 公告
    if (config.notice && config.notice.title) {
      this._onNotice?.(config.notice);
    }

    logger.d('Config applied from', source);
  }

  _runVersionCheck(config) {
    const result = {};
    if (config.minVersion && compareVersions(this.currentVersion, config.minVersion) < 0) {
      result.type = 'BELOW_MIN_VERSION';
    } else if (config.version && compareVersions(this.currentVersion, config.version) < 0) {
      result.type = 'NEW_VERSION_AVAILABLE';
    } else {
      result.type = 'UP_TO_DATE';
    }
    result.config = config;
    this._onVersionCheck?.(result);
  }
}
