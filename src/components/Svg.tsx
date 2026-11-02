import type { CSSProperties } from "react";

/** Inline style that places an element in the slide's fade-in sequence. */
export const seqStyle = (seq?: number): CSSProperties | undefined =>
  seq === undefined ? undefined : ({ "--seq": seq } as CSSProperties);

const ARROW = "M0,0 L10,5 L0,10 z";

// Shared <defs>: default arrowhead, a start-reversed variant for two-way
// edges, and accent-colored variants for edges added on the current slide.
export function Defs() {
  const marker = (id: string, orient: string, fill: string) => (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient={orient}>
      <path d={ARROW} fill={fill} />
    </marker>
  );
  return (
    <defs>
      {marker("arrow", "auto", "var(--line)")}
      {marker("arrow-start", "auto-start-reverse", "var(--line)")}
      {marker("arrow-new", "auto", "var(--accent)")}
      {marker("arrow-start-new", "auto-start-reverse", "var(--accent)")}
    </defs>
  );
}

// Labeled box. `kind` is a space-separated class list:
//   color: "client" | "service" | "data" | "infra" | "stream" | "ml"
//   style: optionally plus "tier" (pass-through layer) or "ghost" (dashed)
//   "new" is added by the scene builder.
// `sub` is an optional second line (e.g. a technology or role note).
export function Box({ x, y, w, h, label, kind, sub, seq }: {
  x: number; y: number; w: number; h: number; label: string; kind: string; sub?: string; seq?: number;
}) {
  const cx = x + w / 2;
  return (
    <g className={`box ${kind}`} style={seqStyle(seq)}>
      <rect x={x} y={y} width={w} height={h} rx="10" />
      <text x={cx} y={sub ? y + h / 2 - 7 : y + h / 2}>{label}</text>
      {sub && <text className="sub" x={cx} y={y + h / 2 + 12}>{sub}</text>}
    </g>
  );
}
