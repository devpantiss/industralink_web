import { ART, type ArtName, type ArtRole, type ArtShape } from "./illustrations";

/** Theme colours, so the drawings follow light and dark mode. */
const COLOR: Record<ArtRole, string> = {
  blob: "rgb(var(--primary-soft))",
  card: "rgb(var(--surface))",
  line: "rgb(var(--border-strong))",
  primary: "rgb(var(--primary))",
  accent: "rgb(var(--accent))",
  white: "#FFFFFF",
};

function Shape({ shape }: { shape: ArtShape }) {
  const paint = {
    fill: shape.fill ? COLOR[shape.fill] : "none",
    stroke: shape.stroke && COLOR[shape.stroke],
    strokeWidth: shape.stroke ? (shape.width ?? 2) : undefined,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeDasharray: shape.dash,
    opacity: shape.opacity,
  };
  if (shape.kind === "circle") return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...paint} />;
  if (shape.kind === "rect") return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} {...paint} />;
  return <path d={shape.d} {...paint} />;
}

/** A small decorative drawing for empty screens. */
export function Illustration({ name, className }: { name: ArtName; className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden>
      {ART[name].map((shape, index) => <Shape key={index} shape={shape} />)}
    </svg>
  );
}
