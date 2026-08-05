/**
 * 地球Online Remote Config 集成组件。
 * 在 App 启动时初始化 Remote Config，处理版本检查弹窗、公告弹窗、调试模式、功能开关。
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Bell, AlertTriangle, Bug } from 'lucide-react';
import { createRemoteConfig } from '../utils/remoteConfig';
import useSettingsStore from '../store/settingsStore';
import useToastStore from '../store/toastStore';
import { copyTextToClipboard } from '../utils/linkUtils';
import { setTotpSecret } from '../utils/totp';

// ---- RSA 公钥（从 PEM 文件内联） ----
const PUBLIC_KEY_PEM = [  '-----BEGIN PUBLIC KEY-----',
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwOZOwl7jEgaMBT7cJ6Sk',
  'I8ysZJTIWBfowc1LXssNV1q0ARyxSkJr380oR5NkleerBn5HUAGjV5j439fVEu5f',
  'O3atofUovV5DsHizYmP0r/IJi4w1Tso6fYOKF1jC844Eq/fJhU53eOGEZCM8ykRr',
  'y1sUp7I7ssIVn7gi29GJOcXzhN6vSmEqLrsPax253rg+XGge/PHE8C81eDgpnghB',
  '5uqpddOWf88mPqhXwyYp2XT2a6MlmtUe4Bwg/Vd0gI41kNtBUAdUlICFjeKcwm6H',
  'lZcdkHN5CM4qWDFD1fmI1Zd3fYn87eziyA9oBByOERhJ3820n4H2HdMKWW1MGqwu',
  'LwIDAQAB',
  '-----END PUBLIC KEY-----',
].join('\n');

/** 远程配置源列表（按优先级） */
const CONFIG_SOURCES = [
  { name: 'cloudflare', url: 'https://earth-online-config.pages.dev/update.json' },
  { name: 'vercel',     url: 'https://earth-online-opal.vercel.app/update.json' },
  { name: 'jsdelivr',   url: 'https://cdn.jsdelivr.net/gh/vernalwhisper-maker/earth-online@main/public/update.json' },
  { name: 'github-raw', url: 'https://raw.githubusercontent.com/vernalwhisper-maker/earth-online/main/public/update.json' },
];

/** 公告已读记录（localStorage）：内容变更后重新弹出 */
const NOTICE_READ_KEY = 'earth-online-notice-read';
// 更新弹窗「确认」已读标记：值为已确认的版本号（如 "1.6.9"）；新版本号到来时重新弹出
const UPDATE_ACK_KEY = 'earth-online-update-ack';
/** GitHub 仓库地址（「立即更新」按钮复制） */
const REPO_URL = 'https://github.com/vernalwhisper-maker/earth-online';

/** 该版本是否已被用户确认（确认后不再弹更新提示） */
function isUpdateAcknowledged(version) {
  try { return version && localStorage.getItem(UPDATE_ACK_KEY) === version; } catch { return false; }
}

function acknowledgeUpdate(version) {
  try { localStorage.setItem(UPDATE_ACK_KEY, version); } catch {}
}

/** 公告唯一标识：title+content+link 的简单 hash */
function noticeHash(notice) {
  const s = `${notice?.title || ''}|${notice?.content || ''}|${notice?.link || ''}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return String(h);
}

function isNoticeRead(hash) {
  try { return localStorage.getItem(NOTICE_READ_KEY) === hash; } catch { return false; }
}

function markNoticeRead(hash) {
  try { localStorage.setItem(NOTICE_READ_KEY, hash); } catch {}
}

/**
 * RemoteConfigProvider 组件。
 * 在 APP 根层使用，自动初始化 Remote Config 并处理各类弹窗。
 *
 * @param {Object} props
 * @param {string} props.currentVersion - 当前版本号
 * @param {boolean} props.debug - 是否启用调试日志
 */
export default function RemoteConfigProvider({ currentVersion = '1.4.0', debug = false }) {
  const [updateDialog, setUpdateDialog] = useState(null);
  const [noticeDialog, setNoticeDialog] = useState(null);
  const rcRef = useRef(null);
  const initializedRef = useRef(false);
  const setAdvancedDebug = useSettingsStore((s) => s.setAdvancedDebug);

  // 与成就弹窗同样处理：motion.create 包装自定义弹窗，AnimatePresence 可正确卸载，避免残留遮罩拦截点击
  const MotionUpdateDialog = motion.create(UpdateDialog);
  const MotionNoticeDialog = motion.create(NoticeDialog);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const rc = createRemoteConfig({
      currentVersion,
      publicKeyPem: PUBLIC_KEY_PEM,
      sources: CONFIG_SOURCES,
      debug,

      onVersionCheck: (result) => {
        if (result.type === 'BELOW_MIN_VERSION') {
          setUpdateDialog({
            type: 'force',
            message: `当前版本 (${currentVersion}) 过低，请更新至 ${result.config.minVersion} 以上才能继续使用`,
            downloadUrl: result.config.downloadUrl,
          });
        } else if (result.type === 'NEW_VERSION_AVAILABLE') {
          // 已确认过该版本 → 不再弹（新版本号到来时重新弹）
          if (isUpdateAcknowledged(result.config.version)) return;
          setUpdateDialog({
            type: 'optional',
            version: result.config.version,
            message: `最新版本 ${result.config.version}，请确认收到通知`,
            downloadUrl: result.config.downloadUrl,
            forceUpdate: result.config.forceUpdate,
          });
        }
      },

      onNotice: (notice) => {
        // 已读的公告不重复弹出（内容变更后 hash 变化会重新弹）
        if (isNoticeRead(noticeHash(notice))) return;
        setNoticeDialog(notice);
      },

      onDebugChange: (enabled) => {
        if (enabled) {
          setAdvancedDebug(true);
          console.log('[RemoteConfig] Debug mode activated');
        }
      },

      onConfigChange: (config) => {
        // Feature flags 会自动通过 isFeatureEnabled 查询生效
        console.log('[RemoteConfig] Config updated, flags:', config.featureFlags);
        // TOTP 密钥由签名配置下发（换密钥无需重新打包）
        if (config.totpSecret) {
          setTotpSecret(config.totpSecret);
        }
      },
    });

    rcRef.current = rc;
    window.__earthRC = rc;
    rc.start();
  }, []);

  return (
    <>
      {/* 版本更新弹窗 */}
      <AnimatePresence>
        {updateDialog && (
          <MotionUpdateDialog key="update" dialog={updateDialog} onClose={() => setUpdateDialog(null)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        )}
      </AnimatePresence>

      {/* 公告弹窗 */}
      <AnimatePresence>
        {noticeDialog && (
          <MotionNoticeDialog key="notice" notice={noticeDialog} onClose={() => {
            markNoticeRead(noticeHash(noticeDialog));
            setNoticeDialog(null);
          }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// 版本更新弹窗
// ============================================================

function UpdateDialog({ dialog, onClose, ...motionProps }) {
  const isForce = dialog.type === 'force';
  const addToast = useToastStore((s) => s.addToast);

  const handleConfirm = () => {
    // 确认收到通知：记录已确认版本，之后不再弹
    if (dialog.version) acknowledgeUpdate(dialog.version);
    onClose();
  };

  const handleUpdate = () => {
    // 复制 GitHub 仓库地址并提醒；同时视为已处理，不再重复弹
    if (dialog.version) acknowledgeUpdate(dialog.version);
    copyTextToClipboard(REPO_URL)
      .then(() => addToast?.("已复制 GitHub 仓库地址，请前往下载最新版", "success", 3500))
      .catch(() => addToast?.("复制失败，请手动前往 GitHub 下载", "error"));
    onClose();
  };

  return (
    <motion.div
      {...motionProps}
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-deep-ink/60" onClick={isForce ? undefined : onClose} />
      <motion.div
        className="relative panel-card p-6 max-w-sm w-full"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald/10 flex items-center justify-center">
            <Download size={20} className="text-emerald" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-deep-ink">
              {isForce ? '需要更新' : '发现新版本'}
            </h3>
          </div>
        </div>

        <p className="text-sm text-warm-steel mb-6">{dialog.message}</p>

        <div className="flex gap-3">
          {isForce ? (
            <>
              <button onClick={onClose}
                className="flex-1 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink hover:bg-canvas-warm">
                暂不更新
              </button>
              <button onClick={handleUpdate}
                className="flex-1 py-2.5 bg-emerald text-white rounded-btn text-sm font-medium">
                立即更新
              </button>
            </>
          ) : (
            <>
              <button onClick={handleConfirm}
                className="flex-1 py-2.5 bg-emerald text-white rounded-btn text-sm font-medium">
                确认
              </button>
              <button onClick={handleUpdate}
                className="flex-1 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink hover:bg-canvas-warm">
                立即更新
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// 公告弹窗
// ============================================================

function NoticeDialog({ notice, onClose, ...motionProps }) {
  return (
    <motion.div
      {...motionProps}
      className="fixed inset-0 z-[9998] flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-deep-ink/60" onClick={onClose} />
      <motion.div
        className="relative panel-card p-6 max-w-sm w-full"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Bell size={20} className="text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-deep-ink">{notice.title}</h3>
        </div>

        <p className="text-sm text-warm-steel mb-4 whitespace-pre-wrap">{notice.content}</p>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-emerald text-white rounded-btn text-sm font-medium">
            知道了
          </button>
          {notice.link && (
            <button onClick={() => window.open(notice.link, '_blank')}
              className="flex-1 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink hover:bg-canvas-warm">
              查看详情
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
