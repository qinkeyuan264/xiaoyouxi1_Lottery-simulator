import { useState, type CSSProperties } from "react";

interface BallProps {
  label: string;
  selected: boolean;
  variant: "red" | "blue";
  onClick: () => void;
}

/**
 * 选号区单球：拟物化「玻璃/烤漆球」质感 —— 径向高光、内外阴影、刻字感数字。
 * 悬停轻微浮起，选中时外发光 + 微内陷模拟按压。
 */
export function Ball({ label, selected, variant, onClick }: BallProps) {
  const [hover, setHover] = useState(false);

  /** 红色球：光源在左上方 */
  const redSurface: CSSProperties = {
    background: "radial-gradient(circle at 30% 28%, #ffcdd2 0%, #ff8a80 18%, #e53935 45%, #b71c1c 78%, #5c0e0e 100%)",
    boxShadow: selected
      ? "inset -4px -6px 12px rgba(0,0,0,0.45), inset 3px 4px 10px rgba(255,255,255,0.35), 0 0 18px 6px rgba(255,235,59,0.85), 0 10px 22px rgba(0,0,0,0.55)"
      : hover
        ? "inset -5px -8px 14px rgba(0,0,0,0.38), inset 4px 5px 12px rgba(255,255,255,0.4), 0 14px 28px rgba(0,0,0,0.5), 0 6px 14px rgba(183,28,28,0.35)"
        : "inset -5px -8px 12px rgba(0,0,0,0.35), inset 4px 4px 10px rgba(255,255,255,0.32), 0 8px 16px rgba(0,0,0,0.45)",
    textShadow:
      "0 1px 0 rgba(255,255,255,0.45), 0 -1px 1px rgba(0,0,0,0.55), 0 2px 3px rgba(0,0,0,0.35)",
    transform: selected ? "scale(0.95)" : hover ? "scale(1.05) translateY(-2px)" : "scale(1)",
    transition: "box-shadow 0.22s ease, transform 0.18s ease, filter 0.2s ease",
  };

  /** 蓝色球：冷色高光 */
  const blueSurface: CSSProperties = {
    background: "radial-gradient(circle at 28% 30%, #e3f2fd 0%, #90caf9 22%, #1e88e5 48%, #0d47a1 82%, #051c38 100%)",
    boxShadow: selected
      ? "inset -4px -6px 12px rgba(0,0,0,0.45), inset 3px 4px 10px rgba(255,255,255,0.3), 0 0 18px 6px rgba(129,212,250,0.95), 0 10px 22px rgba(0,0,0,0.55)"
      : hover
        ? "inset -5px -8px 14px rgba(0,0,0,0.38), inset 4px 5px 12px rgba(255,255,255,0.35), 0 14px 28px rgba(0,0,0,0.48), 0 6px 14px rgba(13,71,161,0.4)"
        : "inset -5px -8px 12px rgba(0,0,0,0.35), inset 4px 4px 10px rgba(255,255,255,0.28), 0 8px 16px rgba(0,0,0,0.42)",
    textShadow:
      "0 1px 0 rgba(255,255,255,0.4), 0 -1px 1px rgba(0,0,0,0.5), 0 2px 3px rgba(0,0,0,0.35)",
    transform: selected ? "scale(0.95)" : hover ? "scale(1.05) translateY(-2px)" : "scale(1)",
    transition: "box-shadow 0.22s ease, transform 0.18s ease, filter 0.2s ease",
  };

  const surface = variant === "red" ? redSurface : blueSurface;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={surface}
      className="relative h-11 w-11 rounded-full text-sm font-bold text-white outline-none ring-0 focus-visible:ring-2 focus-visible:ring-amber-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      aria-pressed={selected}
    >
      {/* 顶部高光层：增强球体体积感 */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse 55% 35% at 35% 22%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.08) 45%, transparent 70%)",
          mixBlendMode: "screen",
          opacity: selected ? 0.75 : 1,
        }}
      />
      <span className="relative z-[1] tracking-tight">{label}</span>
    </button>
  );
}
