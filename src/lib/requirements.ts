import type { NonFunctionalRequirements } from "../types";

// ============================================================================
// Layout of the non-functional requirements slide, shared by the diagram and
// the validator. Units are the requirement viewBox (1200 × 640).
// ============================================================================

export const REQ_W = 1200, REQ_H = 640;

export const NFR_TOP = 66, NFR_CARD_H = 128, NFR_CARD_GAP = 13;

// Estimates panel: title baseline, first row baseline, line and row spacing.
export const EST_TITLE_DY = 32, EST_FIRST_DY = 66, EST_LINE = 21, EST_ROW_GAP = 36, EST_PAD_BOTTOM = 20;

// Takeaway panel: first line baseline and line spacing.
export const TAKE_FIRST_DY = 64, TAKE_LINE = 22;

export const gridHeight = (n: number, h: number, gap: number) => Math.ceil(n / 3) * (h + gap) - gap;

// Where everything sits. The estimates panel is at least as tall as the card
// grid (or `height`), and grows to fit its rows; the takeaway goes below both.
export function nfrLayout(req: NonFunctionalRequirements) {
  const cardsH = gridHeight(req.cards.length, NFR_CARD_H, NFR_CARD_GAP);
  const { rows } = req.estimates;
  const lastBaseline = EST_FIRST_DY
    + rows.reduce((sum, [, vs]) => sum + vs.length * EST_LINE, 0)
    + (rows.length - 1) * EST_ROW_GAP;
  const estH = Math.max(req.estimates.height ?? cardsH, lastBaseline + EST_PAD_BOTTOM);
  const takeY = NFR_TOP + Math.max(cardsH, estH) + 20;
  const takeH = Math.max(108, TAKE_FIRST_DY + 22 + (req.takeaway.lines.length - 1) * TAKE_LINE);
  return { cardsH, estH, takeY, takeH, bottom: takeY + takeH };
}
