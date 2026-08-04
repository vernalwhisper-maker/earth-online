import { useEffect, useState } from "react";
import { getIconFilename } from "../../data/achievements";
import { xorBytes } from "../../utils/hidden";

/**
 * 成就图标统一渲染：
 * - iconType "black"：纯黑（隐藏成就 · 破损系列）
 * - iconType "encrypted"：加密 bin 文件，运行时 fetch 解密为 Blob（隐藏成就 · 永脱轮回）
 * - 其他：public/icons 下的普通图片
 */
export default function AchievementIcon({ achievement, className = "" }) {
  const [url, setUrl] = useState(null);

  const isEncrypted = achievement.iconType === "encrypted";

  useEffect(() => {
    if (!isEncrypted) return;
    let cancelled = false;
    fetch(`/hidden/${achievement.iconFile}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        if (cancelled) return;
        const dec = xorBytes(new Uint8Array(buf));
        const blob = new Blob([dec], { type: "image/png" });
        setUrl(URL.createObjectURL(blob));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isEncrypted, achievement.iconFile]);

  if (achievement.iconType === "black") {
    return <div className={`w-full h-full bg-black ${className}`} aria-hidden />;
  }

  if (isEncrypted) {
    if (!url) {
      // 解密未完成：占位（深色），避免闪烁
      return <div className={`w-full h-full bg-slate-900 ${className}`} aria-hidden />;
    }
    return (
      <img
        src={url}
        alt={achievement.name}
        className={`w-full h-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <img
      src={`/icons/${getIconFilename(achievement.id)}`}
      alt={achievement.name}
      className={`w-full h-full object-cover ${className}`}
      loading="lazy"
    />
  );
}
