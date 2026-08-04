import { useRef, useState, useLayoutEffect } from "react";
import gsap from "gsap";
import TagBarCapsule from "./TagBarCapsule";
import { Tags, ChevronDown } from "lucide-react";

/**
 * APP 端标签栏（GSAP 渐变展开版）。
 *
 * 动画：点击胶囊后，卡片在【径向渐变 mask】中从胶囊位置向外渐变显现
 *  （mask: radial-gradient(circle at 胶囊中心, black 半径, transparent)，
 *    GSAP 动画 --mr 半径从胶囊大小扩散到覆盖整张卡片）。
 *  - 卡片与内容始终清晰（mask 只控制显现区域，零变形、零重排）
 *  - 渐变动画：干净、柔和，符合「胶囊 → 卡片」的连续感
 *  - 打断：killTweensOf + overwrite:"auto"
 *
 * 胶囊按钮与 Web 端 1:1（TagBarCapsule）。通过「标签栏调试」开关
 * （auto/web/app）强制双端样式，保持动画一致。
 *
 * props:
 *  - options: string[] 筛选项（全部/今天/本周/各标签）
 *  - counts:  { [option]: number } 各选项笔记计数
 *  - selected: 当前选中项
 *  - onSelect: (option) => void
 */
export default function AppTagBar({ options = [], counts = {}, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const capsuleRef = useRef(null);   // 胶囊按钮（渐变圆心参照）
  const cardRef = useRef(null);      // 卡片（mask 渐变主体）
  const tweenRef = useRef(null);     // 当前渐变 tween
  const radius0Ref = useRef(0);      // 收起半径（胶囊大小）
  const centerRef = useRef({ mx: 0, my: 0 });

  const current = selected || "全部";
  const currentCount = counts[current] ?? 0;

  // ---- 展开 ----
  const open = () => {
    if (expanded || !capsuleRef.current) return;
    gsap.killTweensOf(cardRef.current);
    tweenRef.current?.kill();
    setExpanded(true);
  };

  useLayoutEffect(() => {
    if (!expanded) return;
    const card = cardRef.current;
    const capsule = capsuleRef.current;
    if (!card || !capsule) return;

    // 1) 胶囊中心（视口坐标）作为渐变圆心
    const r = capsule.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    // 2) 定位卡片：胶囊左对齐下方展开，宽度自适应，防溢出
    const w = Math.min(400, window.innerWidth - 24);
    let left = Math.min(r.left, window.innerWidth - w - 12);
    left = Math.max(12, left);
    let top = r.bottom + 8;
    if (top + 380 > window.innerHeight) top = Math.max(12, r.top - 380);
    gsap.set(card, { left, top, width: w, opacity: 1 });

    // 3) 圆心换算为卡片内相对坐标；半径从胶囊大小扩散到覆盖整卡
    const mx = cx - left;
    const my = cy - top;
    const r0 = Math.max(r.width, r.height) / 2 + 4;
    const r1 = Math.hypot(w, card.offsetHeight) + 60;
    centerRef.current = { mx, my };
    radius0Ref.current = r0;
    gsap.set(card, { "--mx": `${mx}px`, "--my": `${my}px`, "--mr": `${r0}px` });

    // 4) GSAP 渐变动画：径向渐变从胶囊位置扩散到覆盖整张卡片
    const tw = gsap.to(card, {
      "--mr": `${r1}px`,
      duration: 0.55,
      ease: "power2.out",
      overwrite: "auto",
      onComplete: () => { tweenRef.current = null; },
    });
    tweenRef.current = tw;

    // 5) 选项在渐变扩散中段淡入（分层浮现）
    gsap.fromTo(
      card.querySelectorAll(".tag-option"),
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, stagger: 0.03, delay: 0.2, duration: 0.25, ease: "power2.out", clearProps: "transform", overwrite: "auto" }
    );
  }, [expanded]);

  // ---- 折叠（渐变收回 + 淡出，可打断展开） ----
  const close = () => {
    const card = cardRef.current;
    gsap.killTweensOf(card);
    tweenRef.current?.kill();
    if (!card) { setExpanded(false); return; }

    gsap.to(card.querySelectorAll(".tag-option"), { opacity: 0, duration: 0.1, ease: "power2.in", overwrite: "auto" });
    gsap.to(card, {
      "--mr": `${radius0Ref.current}px`,
      duration: 0.28,
      ease: "power2.in",
      overwrite: "auto",
      onComplete: () => setExpanded(false),
    });
    gsap.to(card.parentElement?.querySelector(".tagbar-overlay"), {
      opacity: 0, duration: 0.24, ease: "power2.inOut", overwrite: "auto",
    });
  };

  return (
    <>
      {/* 胶囊（页面流内，与 Web 端 1:1） */}
      <div className="mb-4">
        <TagBarCapsule
          ref={capsuleRef}
          label={current}
          count={currentCount}
          onClick={open}
        />
      </div>

      {/* 展开浮层（径向渐变 mask 显现卡片） */}
      {expanded && (
        <div className="fixed inset-0 z-50">
          {/* 遮罩 */}
          <div
            className="tagbar-overlay absolute inset-0 bg-black/30 dark:bg-black/50"
            style={{ opacity: 0 }}
            onClick={close}
          />
          {/* 卡片（tagbar-mask：从胶囊位置渐变显现） */}
          <div
            ref={cardRef}
            className="tagbar-mask absolute overflow-hidden bg-surface dark:bg-[#232e3c] shadow-2xl border border-white/20 dark:border-white/10 backdrop-blur-2xl"
            style={{ opacity: 0 }}
          >
            {/* 卡片头（与胶囊同款内容） */}
            <div className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-deep-ink">
              <Tags size={14} className="text-warm-steel shrink-0" />
              <span className="truncate">{current}</span>
              <span className="text-faded-slate text-xs font-normal shrink-0">({currentCount})</span>
              <span className="shrink-0 ml-auto" style={{ transform: "rotate(180deg)" }}>
                <ChevronDown size={14} className="text-faded-slate" />
              </span>
            </div>
            {/* 选项网格 */}
            <div className="grid grid-cols-2 gap-2 px-3 pb-3 pt-1 max-h-[42vh] overflow-y-auto">
              {options.map((opt) => {
                const active = selected === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    className={
                      "tag-option flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-colors " +
                      (active
                        ? "border-emerald bg-emerald/10 text-emerald font-medium"
                        : "border-scribe/60 text-deep-ink hover:bg-black/5 dark:hover:bg-white/5")
                    }
                    onClick={() => { onSelect(opt); close(); }}
                  >
                    <span className="truncate">{opt}</span>
                    <span className={"text-xs shrink-0 ml-2 font-mono " + (active ? "text-emerald" : "text-faded-slate")}>{counts[opt] ?? 0}</span>
                  </button>
                );
              })}
            </div>
            {selected && selected !== "全部" && (
              <div className="px-3 pb-3 pt-0.5">
                <button
                  type="button"
                  className="text-xs text-warm-steel hover:text-rose transition-colors"
                  onClick={() => { onSelect("全部"); close(); }}
                >
                  清除筛选
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
