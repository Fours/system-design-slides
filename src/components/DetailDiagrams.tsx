import { ENTITY_HEAD, ENTITY_ROW, type BulletsFrame, type EntitiesFrame, type SequenceFrame, type TableFrame } from "../lib/detail";
import { svgInline } from "../lib/markdown";
import { Box, Defs, seqStyle } from "./Svg";

// ============================================================================
// Detail-slide diagrams, drawn from the frames in lib/detail.ts. Elements
// with class "reveal" fade in one at a time in `seq` order, like new
// elements on a scene slide, but without the "new" glow.
// ============================================================================

export function SequenceDiagram({ frame }: { frame: SequenceFrame }) {
  return (
    <>
      <Defs />
      {frame.lifelines.map((l) => <path key={l.key} className="lifeline" d={`M${l.x},${l.y1} L${l.x},${l.y2}`} />)}
      {frame.actors.map(({ key, ...a }) => <Box key={key} {...a} />)}
      {frame.notes.map((n) => (
        <g key={n.key} className="reveal" style={seqStyle(n.seq)}>
          <rect className="seq-note" x={n.x} y={n.y} width={n.w} height={n.h} rx="6" />
          <text className="seq-note-text" x={n.x + n.w / 2} y={n.y + n.h / 2}>{svgInline(n.text)}</text>
        </g>
      ))}
      {frame.messages.map((m) => (
        <g key={m.key} className="reveal" style={seqStyle(m.seq)}>
          <path className={`edge${m.reply ? " async" : ""}`} d={m.d} />
          <text className="seq-label" x={m.lx} y={m.ly} style={{ textAnchor: m.anchor }}>
            <tspan className="seq-num">{m.num}. </tspan>{svgInline(m.label)}
          </text>
        </g>
      ))}
    </>
  );
}

export function EntitiesDiagram({ frame }: { frame: EntitiesFrame }) {
  return (
    <>
      {frame.relations.map((r) => (
        <g key={r.key} className="reveal" style={seqStyle(r.seq)}>
          <path className="edge plain" d={r.d} />
          {r.label && <text className="edge-label" x={r.lx} y={r.ly}>{r.label}</text>}
        </g>
      ))}
      {frame.items.map((e) => (
        <g key={e.key} className={`entity box ${e.kind} reveal`} style={seqStyle(e.seq)}>
          <rect x={e.x} y={e.y} width={e.w} height={e.h} rx="10" />
          <text x={e.x + e.w / 2} y={e.y + ENTITY_HEAD / 2}>{e.name}</text>
          <path className="entity-rule" d={`M${e.x},${e.y + ENTITY_HEAD} L${e.x + e.w},${e.y + ENTITY_HEAD}`} />
          {e.fields.map((f, i) => (
            <text key={i} className="entity-field" x={e.x + 16} y={e.y + ENTITY_HEAD + 18 + i * ENTITY_ROW}>{f}</text>
          ))}
        </g>
      ))}
    </>
  );
}

export function BulletsDiagram({ frame }: { frame: BulletsFrame }) {
  return (
    <>
      <text className="heading bullets-heading" x="130" y={frame.headingY}>{frame.heading}</text>
      {frame.items.map((b) => (
        <g key={b.key} className="reveal" style={seqStyle(b.seq)}>
          <circle className="bullet-dot" cx="152" cy={b.y - 8} r="6" />
          <text className="bullet-text" x="176" y={b.y}>{svgInline(b.text)}</text>
          {b.detail && <text className="bullet-detail" x="176" y={b.y + 26}>{svgInline(b.detail)}</text>}
        </g>
      ))}
    </>
  );
}

export function TableDiagram({ frame }: { frame: TableFrame }) {
  const { xs, rowH, headingY, headerY } = frame;
  const x0 = xs[0], x1 = xs[xs.length - 1];
  const cells = (texts: string[], y: number, cls: string) =>
    texts.map((t, j) => <text key={j} className={cls} x={xs[j] + 16} y={y + rowH / 2}>{svgInline(t)}</text>);
  return (
    <>
      <text className="heading" x="30" y={headingY}>{frame.heading}</text>
      {frame.rows.map((r) => (
        <g key={r.key} className={`reveal${r.highlight ? " table-pick" : ""}`} style={seqStyle(r.seq)}>
          <rect className="table-row" x={x0} y={r.y} width={x1 - x0} height={rowH} />
          {cells(r.cells, r.y, "table-cell")}
        </g>
      ))}
      {/* Drawn after the rows so the first row's border can't cover the header's bottom edge. */}
      <rect className="table-head" x={x0} y={headerY} width={x1 - x0} height={rowH} />
      {cells(frame.columns, headerY, "table-col")}
    </>
  );
}
