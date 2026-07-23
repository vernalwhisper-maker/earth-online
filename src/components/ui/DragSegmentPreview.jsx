import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import LiquidGlass from "./LiquidGlass/index";

const OPTIONS = ["列表", "分类", "文件夹"];

export default function DragSegmentPreview({ params }) {
  const { cornerRadius, elasticity, blurAmount, saturation, displacementScale, aberrationIntensity, mode, overLight, shadowOpacity } = params;
  const barRef = useRef(null);
  const [dragState, setDragState] = useState("idle"); // idle | long-pressing | dragging
  const [pillX, setPillX] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [optionCenters, setOptionCenters] = useState([]);
  const longPressTimer = useRef(null);
  const dragOffset = useRef(0); // px offset from option center on grab

  // Measure option positions
  const measureOptions = useCallback(() => {
    if (!barRef.current) return;
    const buttons = barRef.current.querySelectorAll("[data-opt]");
    const rects = Array.from(buttons).map((b) => {
      const r = b.getBoundingClientRect();
      const bar = barRef.current.getBoundingClientRect();
      return r.left + r.width / 2 - bar.left;
    });
    setOptionCenters(rects);
  }, []);

  useEffect(() => {
    measureOptions();
    const onResize = () => measureOptions();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureOptions]);

  // Start long press
  const handlePointerDown = useCallback((e) => {
    const bar = barRef.current;
    if (!bar) return;
    const barRect = bar.getBoundingClientRect();
    const downX = e.clientX - barRect.left;

    // Cursor offset: could be clicking on already-selected option or empty area
    measureOptions();

    longPressTimer.current = setTimeout(() => {
      // Long press activated
      setDragState("dragging");
      setPillX(downX);
      // Find nearest option for offset
      const centers = barRef.current ? (() => {
        const btns = barRef.current.querySelectorAll("[data-opt]");
        return Array.from(btns).map((b) => {
          const r = b.getBoundingClientRect();
          const barR = barRef.current.getBoundingClientRect();
          return r.left + r.width / 2 - barR.left;
        });
      })() : [];
      const nearest = findNearest(downX, centers);
      dragOffset.current = downX - (centers[nearest] ?? downX);
    }, 300);
  }, [measureOptions]);

  const handlePointerMove = useCallback((e) => {
    if (dragState !== "dragging") return;
    const bar = barRef.current;
    if (!bar) return;
    const barRect = bar.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - barRect.left - dragOffset.current, barRect.width));
    setPillX(x);
  }, [dragState]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (dragState === "dragging") {
      const nearest = findNearest(pillX, optionCenters);
      setActiveIdx(nearest);
      setDragState("idle");
      setPillX(optionCenters[nearest] ?? 0);
    }
    setDragState("idle");
  }, [dragState, pillX, optionCenters]);

  const findNearest = (x, centers) => {
    if (!centers || centers.length === 0) return 0;
    let minDist = Infinity, minIdx = 0;
    centers.forEach((cx, i) => {
      const d = Math.abs(x - cx);
      if (d < minDist) { minDist = d; minIdx = i; }
    });
    return minIdx;
  };

  // Magnetic snap threshold (css px)
  const SNAP_THRESHOLD = 36;
  const snapTarget = (() => {
    if (dragState !== "dragging") return null;
    const nearest = findNearest(pillX, optionCenters);
    if (optionCenters.length === 0 || nearest >= optionCenters.length) return null;
    const dist = Math.abs(pillX - optionCenters[nearest]);
    if (dist < SNAP_THRESHOLD) return optionCenters[nearest];
    return null;
  })();

  const displayPillX = snapTarget !== null ? snapTarget : pillX;
  const pillWidth = 48;

  return (
    <div
      ref={barRef}
      className="relative select-none"
      style={{ touchAction: "none", padding: "6px 4px" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* 选项底条 */}
      <div className="flex justify-around rounded-full" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(4px)" }}>
        {OPTIONS.map((label, i) => (
          <span key={label} data-opt
            className="relative px-3 py-1.5 text-xs text-center select-none"
            style={{ width: pillWidth, fontWeight: i === activeIdx ? 700 : 500, color: i === activeIdx ? "#059669" : "rgba(163,162,158,0.8)" }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* 拖拽胶囊 */}
      {dragState === "dragging" && (
        <div
          className="absolute top-0"
          style={{
            left: `calc(${displayPillX}px - ${pillWidth / 2}px)`,
            width: pillWidth,
            height: "100%",
            pointerEvents: "none",
            transition: snapTarget !== null ? "left 0.12s cubic-bezier(0.22,1,0.36,1)" : "none",
          }}
        >
          <LiquidGlass
            cornerRadius={cornerRadius} padding="0"
            elasticity={elasticity} blurAmount={blurAmount} saturation={saturation}
            displacementScale={displacementScale} aberrationIntensity={aberrationIntensity}
            mode={mode} overLight={overLight} shadowOpacity={shadowOpacity}
            wrapperStyle={{}}
          >
            <div className="flex items-center justify-center" style={{ width: pillWidth, height: 32 }}>
              <span className="text-[10px] font-bold text-deep-ink">{OPTIONS[activeIdx]}</span>
            </div>
          </LiquidGlass>
        </div>
      )}
    </div>
  );
}
