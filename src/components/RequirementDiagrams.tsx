import type { FunctionalRequirements, NonFunctionalRequirements, RequirementCard } from "../types";

// ============================================================================
// Requirement-slide diagrams. Both use viewBox 0 0 1200 640.
// ============================================================================

export const REQUIREMENTS_VIEWBOX = "0 0 1200 640";

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

const gridHeight = (n: number, h: number, gap: number) => Math.ceil(n / 3) * (h + gap) - gap;

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
        <text key={i} className="strip-text" x={x + 24} y={y + 64 + i * 22}>{l}</text>
      ))}
    </g>
  );
}

// Gray-bordered, unfilled panel of back-of-the-envelope estimates.
function EstimatesPanel({ x, y, w, h, rows, isNew }: {
  x: number; y: number; w: number; h: number; rows: [string, string[]][]; isNew: boolean;
}) {
  let cy = y + 66;
  const body = rows.flatMap(([k, vs], r) => {
    const out = [<text key={`${r}`} className="est-k" x={x + 20} y={cy}>{k}</text>];
    vs.forEach((v, i) => { cy += 21; out.push(<text key={`${r}.${i}`} className="est-v" x={x + 20} y={cy}>{v}</text>); });
    cy += 36;
    return out;
  });
  return (
    <g className={isNew ? "new" : ""}>
      <rect className="est-box" x={x} y={y} width={w} height={h} rx="10" />
      <text className="est-title" x={x + 20} y={y + 32}>Back of the envelope</text>
      {body}
    </g>
  );
}

// The heading, the first `show` cards (the last of them highlighted), and
// optionally the out-of-scope strip below the grid.
export function FrDiagram({ req, show, withStrip }: { req: FunctionalRequirements; show: number; withStrip: boolean }) {
  const h = 128, gap = 15;
  return (
    <>
      <text className="heading" x="30" y="42">Functional requirements</text>
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
  const h = 128, gap = 13;
  const cardsH = gridHeight(req.cards.length, h, gap);
  const estH = req.estimates.height ?? cardsH;
  return (
    <>
      <text className="heading" x="30" y="42">Non-functional requirements</text>
      <CardGrid x0={30} y0={66} w={255} h={h} gap={gap} cards={req.cards} show={show} fresh={withEstimates ? -1 : show - 1} />
      {withEstimates && (
        <EstimatesPanel x={836} y={66} w={334} h={estH} rows={req.estimates.rows} isNew={!withTakeaway} />
      )}
      {withTakeaway && (
        <LinesBox x={30} y={66 + Math.max(cardsH, estH) + 20} w={1140} h={100} variant="panel-box"
          title={req.takeaway.heading ?? "Takeaway"} lines={req.takeaway.lines} isNew />
      )}
    </>
  );
}
