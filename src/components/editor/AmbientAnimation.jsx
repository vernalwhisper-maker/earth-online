import { useMemo } from "react";
import { motion } from "framer-motion";

// 星空粒子
function StarryParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      drift: (Math.random() - 0.5) * 60,
    })), []
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="anim-particle"
          style={{
            left: p.left + "%",
            bottom: "-10px",
            width: p.size + "px",
            height: p.size + "px",
            backgroundColor: "rgba(255,255,255,0.6)",
          }}
          animate={{
            y: [0, -window.innerHeight - 50],
            x: [0, p.drift],
            opacity: [0, 0.8, 0.6, 0],
          }}
          transition={{
            duration: p.duration + 4,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

// 浮游几何
function FloatGeo() {
  const shapes = useMemo(() => {
    const items = [];
    const colors = ["#10b981", "#8b5cf6", "#f59e0b", "#3b82f6", "#e11d48"];
    for (let i = 0; i < 12; i++) {
      items.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 20 + Math.random() * 40,
        color: colors[i % colors.length],
        rotation: Math.random() * 360,
        delay: Math.random() * 3,
        duration: 6 + Math.random() * 6,
        shape: i % 3 === 0 ? "circle" : i % 3 === 1 ? "square" : "triangle",
      });
    }
    return items;
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {shapes.map((s) => (
        <motion.div
          key={s.id}
          className="anim-geo"
          style={{
            left: s.left + "%",
            top: s.top + "%",
            width: s.size + "px",
            height: s.size + "px",
            backgroundColor: s.color,
            borderRadius: s.shape === "circle" ? "50%" : s.shape === "square" ? "4px" : "0",
            clipPath: s.shape === "triangle" ? "polygon(50% 0%, 0% 100%, 100% 100%)" : undefined,
          }}
          animate={{
            y: [0, -20, 0, -15, 0],
            rotate: [s.rotation, s.rotation + 15, s.rotation - 10, s.rotation + 20, s.rotation],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            delay: s.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default function AmbientAnimation({ theme }) {
  if (!theme || theme === "none") return null;

  switch (theme) {
    case "starry":
      return <StarryParticles />;
    case "float":
      return <FloatGeo />;
    case "shimmer":
      // shimmer 用 CSS ::before 实现，不需要组件
      return null;
    default:
      return null;
  }
}
