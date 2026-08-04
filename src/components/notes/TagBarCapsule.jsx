import { forwardRef } from "react";
import { Tags, ChevronDown } from "lucide-react";

/**
 * 标签栏胶囊按钮（Web / APP 双端 1:1 共用）。
 * 仅负责胶囊本身的外观与交互反馈；点击行为由调用方决定
 * （Web 端打开底部 sheet / APP 端 morph 展开成卡片）。
 * 支持 forwardRef（APP 端 FLIP 需要测量按钮精确 rect）与事件透传（按下回弹）。
 */
const TagBarCapsule = forwardRef(function TagBarCapsule(
  { label, count, onClick, className = "", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={
        "flex items-center gap-1.5 px-3.5 py-2 bg-group rounded-full text-sm font-medium text-deep-ink " +
        "active:bg-black/5 dark:active:bg-white/5 transition-colors " +
        className
      }
      {...rest}
    >
      <Tags size={14} className="text-warm-steel" />
      <span className="truncate">{label}</span>
      <span className="text-faded-slate text-xs font-normal shrink-0">({count})</span>
      <ChevronDown size={14} className="text-faded-slate shrink-0" />
    </button>
  );
});

export default TagBarCapsule;
