import type { FunctionalRequirements, NonFunctionalRequirements, RequirementCard } from "../types";
import { EST_FIRST_DY, EST_LINE, EST_ROW_GAP, EST_TITLE_DY, NFR_CARD_GAP, NFR_CARD_H, NFR_TOP,
  REQ_H, REQ_W, TAKE_FIRST_DY, TAKE_LINE, gridHeight, nfrLayout } from "../lib/requirements";
import { seqStyle } from "./Svg";

// ============================================================================
// Requirement-slide diagrams. Both use viewBox 0 0 1200 640.
// ============================================================================

export const REQUIREMENTS_VIEWBOX = `0 0 ${REQ_W} ${REQ_H}`;

// One numbered requirement card: a title plus 1–3 short lines.
// `isNew` highlights it and fades it in.
function Card({ x, y, w, h, num, card, isNew }: {
  x: number; y: number; w: number; h: number; num: number; card: RequirementCard; isNew: boolean;
}) {
  return (
    <g className={`card${isNew ? " new" : ""}`}>
      <rect x={x} y={y} width={w} height={h} rx="10" />
      <circle className="badge" cx={x + 30} cy={y + 30} r="13" />
      <text className="badge-num" x={x + 30} y={y + 30}>{num}</text>
      <text className="title" x={x + 52} y={y + 36}>{card.title}</text>
      {card.lines.map((l, i) => (
        <text key={i} className="line" x={x + 18} y={y + 66 + i * 21}>{l}</text>
      ))}
    </g>
  );
}

// A 3-column grid of cards, numbered 1..N. Only the first `show` are drawn,
// and the one at index `fresh` is highlighted as new (-1 for none).
function CardGrid({ x0, y0, w, h, gap, cards, show, fresh }: {
  x0: number; y0: number; w: number; h: number; gap: number; cards: RequirementCard[]; show: number; fresh: number;
}) {
  const cols = 3;
  return (
    <>
      {cards.slice(0, show).map((card, i) => (
        <Card key={i} x={x0 + (i % cols) * (w + gap)} y={y0 + Math.floor(i / cols) * (h + gap)}
          w={w} h={h} num={i + 1} card={card} isNew={i === fresh} />
      ))}
    </>
  );
}

// A titled box of lines: the dashed out-of-scope strip ("strip") or the
// accent-bordered takeaway panel ("panel-box"). Fades in when `isNew`.
function LinesBox({ x, y, w, h, variant, title, lines, isNew }: {
  x: number; y: number; w: number; h: number; variant: "strip" | "panel-box"; title: string; lines: string[]; isNew: boolean;
}) {
  return (
    <g className={isNew ? "new" : ""}>
      <rect className={variant} x={x} y={y} width={w} height={h} rx="10" />
      <text className={variant === "strip" ? "strip-title" : "panel-title"} x={x + 24} y={y + 34}>{title}</text>
      {lines.map((l, i) => (
        <text key={i} className="strip-text" x={x + 24} y={y + TAKE_FIRST_DY + i * TAKE_LINE}>{l}</text>
      ))}
    </g>
  );
}

// Gray-bordered, unfilled panel of back-of-the-envelope estimates.
function EstimatesPanel({ x, y, w, h, rows, isNew }: {
  x: number; y: number; w: number; h: number; rows: [string, string[]][]; isNew: boolean;
}) {
  let cy = y + EST_FIRST_DY - EST_LINE;
  const body = rows.flatMap(([k, vs], r) => {
    cy += EST_LINE;
    const out = [<text key={`${r}`} className="est-k" x={x + 20} y={cy}>{k}</text>];
    vs.forEach((v, i) => { cy += EST_LINE; out.push(<text key={`${r}.${i}`} className="est-v" x={x + 20} y={cy}>{v}</text>); });
    cy += EST_ROW_GAP - EST_LINE;
    return out;
  });
  return (
    <g className={isNew ? "new" : ""}>
      <rect className="est-box" x={x} y={y} width={w} height={h} rx="10" />
      <text className="est-title" x={x + 20} y={y + EST_TITLE_DY}>Back of the envelope</text>
      {body}
    </g>
  );
}

// 2–3 large emoji side by side, centered below the heading; each fades in
// after the one before it.
function EmojiRow({ emoji }: { emoji: string[] }) {
  const pitch = 260, cy = (66 + REQ_H) / 2;
  const x0 = REQ_W / 2 - ((emoji.length - 1) * pitch) / 2;
  return (
    <>
      {emoji.map((e, i) => (
        <text key={i} className="hero-emoji new" x={x0 + i * pitch} y={cy} style={seqStyle(i)}>{e}</text>
      ))}
    </>
  );
}

// The heading, the first `show` cards (the last of them highlighted), and
// optionally the out-of-scope strip below the grid. The title-only slide
// (no cards, no strip) shows the intro emoji instead.
export function FrDiagram({ req, show, withStrip }: { req: FunctionalRequirements; show: number; withStrip: boolean }) {
  const h = 128, gap = 15;
  return (
    <>
      <text className="heading" x="30" y="42">Functional requirements</text>
      {show === 0 && !withStrip && req.intro.emoji?.length ? <EmojiRow emoji={req.intro.emoji} /> : null}
      <CardGrid x0={30} y0={66} w={370} h={h} gap={gap} cards={req.cards} show={show} fresh={withStrip ? -1 : show - 1} />
      {withStrip && (
        <LinesBox x={30} y={66 + gridHeight(req.cards.length, h, gap) + 32} w={1140} h={100} variant="strip"
          title="Out of scope (mentioned, not designed)" lines={req.outOfScope.lines} isNew />
      )}
    </>
  );
}

// The heading, the first `show` cards, and optionally the estimates panel
// (right of the cards) and the takeaway panel (below both). The last thing
// added is the one highlighted as new.
export function NfrDiagram({ req, show, withEstimates, withTakeaway }: {
  req: NonFunctionalRequirements; show: number; withEstimates: boolean; withTakeaway: boolean;
}) {
  const { estH, takeY, takeH } = nfrLayout(req);
  return (
    <>
      <text className="heading" x="30" y="42">Non-functional requirements</text>
      <CardGrid x0={30} y0={NFR_TOP} w={255} h={NFR_CARD_H} gap={NFR_CARD_GAP} cards={req.cards} show={show}
        fresh={withEstimates ? -1 : show - 1} />
      {withEstimates && (
        <EstimatesPanel x={836} y={NFR_TOP} w={334} h={estH} rows={req.estimates.rows} isNew={!withTakeaway} />
      )}
      {withTakeaway && (
        <LinesBox x={30} y={takeY} w={1140} h={takeH} variant="panel-box"
          title={req.takeaway.heading ?? "Takeaway"} lines={req.takeaway.lines} isNew />
      )}
    </>
  );
}
