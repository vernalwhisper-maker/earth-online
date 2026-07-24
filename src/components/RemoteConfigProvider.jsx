/**
 * 地球Online Remote Config 集成组件。
 * 在 App 启动时初始化 Remote Config，处理版本检查弹窗、公告弹窗、调试模式、功能开关。
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Bell, AlertTriangle, Bug } from 'lucide-react';
import { createRemoteConfig } from '../utils/remoteConfig';
import useSettingsStore from '../store/settingsStore';

// ---- RSA 公钥（从 PEM 文件内联） ----
const PUBLIC_KEY_PEM = [
  '-----BEGIN PUBLIC KEY-----',
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
          setUpdateDialog({
            type: 'optional',
            message: `发现新版本 ${result.config.version}，是否更新？`,
            downloadUrl: result.config.downloadUrl,
            forceUpdate: result.config.forceUpdate,
          });
        }
      },

      onNotice: (notice) => {
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
          <UpdateDialog dialog={updateDialog} onClose={() => setUpdateDialog(null)} />
        )}
      </AnimatePresence>

      {/* 公告弹窗 */}
      <AnimatePresence>
        {noticeDialog && (
          <NoticeDialog notice={noticeDialog} onClose={() => setNoticeDialog(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// 版本更新弹窗
// ============================================================

function UpdateDialog({ dialog, onClose }) {
  const isForce = dialog.type === 'force';

  const handleUpdate = () => {
    if (dialog.downloadUrl) {
      window.open(dialog.downloadUrl, '_blank');
    }
    if (!isForce && !dialog.forceUpdate) {
      onClose();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-deep-ink/60" onClick={isForce ? undefined : onClose} />
      <motion.div
        className="relative bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft"
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
          {!isForce && !dialog.forceUpdate && (
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-scribe rounded-btn text-sm text-deep-ink hover:bg-canvas-warm">
              稍后更新
            </button>
          )}
          <button onClick={handleUpdate}
            className="flex-1 py-2.5 bg-emerald text-white rounded-btn text-sm font-medium">
            立即更新
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// 公告弹窗
// ============================================================

function NoticeDialog({ notice, onClose }) {
  return (
    <motion.div
      className="fixed inset-0 z-[9998] flex items-center justify-center px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-deep-ink/60" onClick={onClose} />
      <motion.div
        className="relative bg-surface rounded-modal p-6 max-w-sm w-full shadow-soft"
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
