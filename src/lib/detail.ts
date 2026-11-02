import type { BulletsSlide, EntitiesSlide, SequenceSlide, TableSlide } from "../types";

// ============================================================================
// Layouts for the "detail" slides that sit between scene steps: sequence
// diagrams, UML entities, bullet lists, and comparison tables. Each turns the
// slide's data into positioned elements plus a viewBox, the way the scene
// builder does for scenes. Elements carry a `seq` for the fade-in order.
// ============================================================================

const plain = (s: string) => s.replace(/\*/g, "");

// Fit a viewBox to [x0, y0, x1, y1] plus padding, with a minimum size.
function fit(x0: number, y0: number, x1: number, y1: number, minW = 900, minH = 460): string {
  const pad = 40;
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  if (x1 - x0 < minW) { const g = (minW - (x1 - x0)) / 2; x0 -= g; x1 += g; }
  if (y1 - y0 < minH) { const g = (minH - (y1 - y0)) / 2; y0 -= g; y1 += g; }
  return `${x0} ${y0} ${x1 - x0} ${y1 - y0}`;
}

// ---- Sequence diagram -------------------------------------------------------

export interface SequenceFrame {
  viewBox: string;
  actors: { key: string; x: number; y: number; w: number; h: number; label: string; sub?: string; kind: string }[];
  /** Dashed vertical lifelines, one per actor. */
  lifelines: { key: string; x: number; y1: number; y2: number }[];
  messages: { key: string; d: string; reply: boolean; num: number; label: string; lx: number; ly: number; anchor: "start" | "middle"; seq: number }[];
  notes: { key: string; x: number; y: number; w: number; h: number; text: string; seq: number }[];
}

export function layoutSequence({ actors, steps }: SequenceSlide["sequence"]): SequenceFrame {
  const col = new Map(actors.map((a, i) => [a.id, i]));
  // Column pitch: wide enough for every actor label and every message label
  // (spread over the columns it spans).
  let cw = 200;
  actors.forEach((a) => { cw = Math.max(cw, plain(a.label).length * 8 + 56); });
  steps.forEach((s) => {
    if ("note" in s) return;
    const span = Math.abs(col.get(s.to)! - col.get(s.from)!) || 1;
    cw = Math.max(cw, (plain(s.label).length * 7 + 60) / span);
  });
  cw = Math.min(cw, 360);
  const cx = (id: string) => col.get(id)! * cw + cw / 2;
  const headH = 54, pitch = 46;

  const frame: SequenceFrame = { viewBox: "", actors: [], lifelines: [], messages: [], notes: [] };
  actors.forEach((a) => {
    const w = cw - 30;
    frame.actors.push({ key: a.id, x: cx(a.id) - w / 2, y: 0, w, h: headH, label: a.label, sub: a.sub, kind: a.kind });
  });

  let y = headH + 44, num = 0;
  steps.forEach((s, i) => {
    if ("note" in s) {
      const xs = s.over.map(cx);
      const x0 = Math.min(...xs) - cw / 2 + 24, x1 = Math.max(...xs) + cw / 2 - 24;
      frame.notes.push({ key: `n${i}`, x: x0, y: y - 16, w: x1 - x0, h: 30, text: s.note, seq: i });
      y += pitch;
      return;
    }
    num++;
    const x1 = cx(s.from), x2 = cx(s.to);
    if (s.from === s.to) {
      // Self-call: a small loop out to the right of the lifeline.
      const d = `M${x1},${y - 8} L${x1 + 36},${y - 8} L${x1 + 36},${y + 12} L${x1},${y + 12}`;
      frame.messages.push({ key: `m${i}`, d, reply: !!s.reply, num, label: s.label, lx: x1 + 44, ly: y + 6, anchor: "start", seq: i });
      y += pitch + 10;
    } else {
      frame.messages.push({ key: `m${i}`, d: `M${x1},${y} L${x2},${y}`, reply: !!s.reply, num, label: s.label,
        lx: (x1 + x2) / 2, ly: y - 8, anchor: "middle", seq: i });
      y += pitch;
    }
  });

  const bottom = y - pitch / 2 + 10;
  actors.forEach((a) => frame.lifelines.push({ key: a.id, x: cx(a.id), y1: headH, y2: bottom }));
  frame.viewBox = fit(0, 0, actors.length * cw, bottom);
  return frame;
}

// ---- UML entities -----------------------------------------------------------

export interface EntitiesFrame {
  viewBox: string;
  items: { key: string; x: number; y: number; w: number; h: number; name: string; kind: string; fields: string[]; seq: number }[];
  relations: { key: string; d: string; label?: string; lx: number; ly: number; seq: number }[];
}

export const ENTITY_HEAD = 40, ENTITY_ROW = 22;

export function layoutEntities({ items, relations = [] }: EntitiesSlide["entities"]): EntitiesFrame {
  const frame: EntitiesFrame = { viewBox: "", items: [], relations: [] };
  const gap = 120;
  let x = 0, maxH = 0;
  items.forEach((it, i) => {
    const w = Math.max(190, it.name.length * 10 + 40, ...it.fields.map((f) => f.length * 7.8 + 32));
    const h = ENTITY_HEAD + it.fields.length * ENTITY_ROW + 14;
    frame.items.push({ key: it.id, x, y: 0, w, h, name: it.name, kind: it.kind ?? "data", fields: it.fields, seq: i });
    x += w + gap;
    maxH = Math.max(maxH, h);
  });

  const at = new Map(frame.items.map((b, i) => [b.key, { b, i }]));
  let over = 0, top = 0;
  relations.forEach((r, k) => {
    const a = at.get(r.from)!, b = at.get(r.to)!;
    const [l, rt] = a.i < b.i ? [a, b] : [b, a];
    const seq = Math.max(a.i, b.i);
    if (rt.i - l.i === 1) {
      // Neighbors: a straight line between the headers.
      const y = ENTITY_HEAD / 2, x1 = l.b.x + l.b.w, x2 = rt.b.x;
      frame.relations.push({ key: `r${k}`, d: `M${x1},${y} L${x2},${y}`, label: r.label, lx: (x1 + x2) / 2, ly: y - 8, seq });
    } else {
      // Further apart: route over the top of the boxes in between.
      const y = -28 - over++ * 22, x1 = l.b.x + l.b.w / 2, x2 = rt.b.x + rt.b.w / 2;
      top = Math.min(top, y - 14);
      frame.relations.push({ key: `r${k}`, d: `M${x1},0 L${x1},${y} L${x2},${y} L${x2},0`, label: r.label,
        lx: (x1 + x2) / 2, ly: y - 7, seq });
    }
  });

  frame.viewBox = fit(0, top, x - gap, maxH);
  return frame;
}

// ---- Bullets and tables (1200-wide, like the requirement slides) -------------

export interface BulletsFrame {
  viewBox: string;
  heading: string;
  items: { key: string; y: number; text: string; detail?: string; seq: number }[];
}

export function layoutBullets({ heading, items }: BulletsSlide["bullets"], title: string): BulletsFrame {
  const pitch = Math.min(84, 470 / Math.max(items.length, 1));
  return {
    viewBox: "0 0 1200 640",
    heading: heading ?? title,
    items: items.map((it, i) => {
      const { text, detail } = typeof it === "string" ? { text: it, detail: undefined } : it;
      return { key: `b${i}`, y: 140 + i * pitch, text, detail, seq: i };
    }),
  };
}

export interface TableFrame {
  viewBox: string;
  heading: string;
  /** Left edge of each column, plus the right edge of the table. */
  xs: number[];
  headerY: number;
  rows: { key: string; y: number; cells: string[]; highlight: boolean; seq: number }[];
  columns: string[];
  rowH: number;
}

export function layoutTable({ heading, columns, rows, highlight }: TableSlide["table"], title: string): TableFrame {
  // Column widths in proportion to their longest text (at least 1 share each).
  const longest = columns.map((c, j) => Math.max(10, plain(c).length, ...rows.map((r) => plain(r[j] ?? "").length)));
  const total = longest.reduce((a, b) => a + b, 0);
  const xs = [30];
  longest.forEach((n) => xs.push(xs[xs.length - 1] + (1140 * n) / total));
  const rowH = 52, headerY = 72;
  const height = Math.max(640, headerY + (rows.length + 1) * rowH + 40);
  return {
    viewBox: `0 0 1200 ${height}`,
    heading: heading ?? title,
    xs, headerY, rowH, columns,
    rows: rows.map((cells, i) => ({ key: `r${i}`, y: headerY + (i + 1) * rowH, cells, highlight: i === highlight, seq: i })),
  };
}
