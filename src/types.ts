// ============================================================================
// The JSON formats served from public/decks/.
//
//   index.json     -> DeckIndex   (the list on the home page)
//   <slug>.json    -> Deck        (one walkthrough)
//
// Script text is "markdown-lite": an array of paragraphs, where **bold**
// renders strong and *dim* renders the dimmed emphasis style.
// ============================================================================

export interface DeckIndex {
  decks: DeckIndexEntry[];
}

export interface DeckIndexEntry {
  /** File name without .json, also the URL path: /#/<slug>. */
  slug: string;
  title: string;
  description: string;
}

/** Paragraphs of markdown-lite text. */
export type Script = string[];

export interface Deck {
  /** Page title, e.g. "Design Slack". */
  title: string;
  /** Badge in the top-left of the diagram panel. */
  topic: string;
  /** Fade-in timing for new elements; defaults to 1000 / 1000 ms. */
  animation?: Animation;
  requirements: {
    functional: FunctionalRequirements;
    nonFunctional: NonFunctionalRequirements;
  };
  /** Every box and edge of each FINAL system, keyed by scene name. */
  scenes: Record<string, SceneDef>;
  /** The architecture slides, in order. Requirement slides are generated. */
  slides: ArchitectureSlide[];
}

export interface Animation {
  delayMs: number;
  fadeMs: number;
}

// ---- Requirements -----------------------------------------------------------

/** A titled slide script (used for the intro / summary requirement slides). */
export interface SlideText {
  title: string;
  script: Script;
}

/** A numbered requirement card; its slide is titled with the card title. */
export interface RequirementCard {
  title: string;
  /** 1–3 short lines shown on the card. */
  lines: string[];
  script: Script;
}

export interface FunctionalRequirements {
  intro: SlideText;
  /** Up to 9 cards (3×3 grid). */
  cards: RequirementCard[];
  /** The dashed out-of-scope strip, and the slide that adds it. */
  outOfScope: SlideText & { lines: string[] };
}

export interface NonFunctionalRequirements {
  intro: SlideText;
  /** Up to 9 cards (3 columns, beside the estimates panel). */
  cards: RequirementCard[];
  /** Back-of-the-envelope panel: rows of [heading, [value, ...]]. */
  estimates: SlideText & {
    rows: [string, string[]][];
    /** Panel height; defaults to the height of the card grid. */
    height?: number;
  };
  /** The takeaway panel. `heading` is drawn in the panel; defaults to "Takeaway". */
  takeaway: SlideText & { heading?: string; lines: string[] };
}

// ---- Scenes -----------------------------------------------------------------

export type Point = [number, number];

/** Space-separated: a color (client | service | data | infra | stream | ml)
 *  plus optionally "tier" or "ghost". */
export type BoxKind = string;

export interface BoxDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  kind: BoxKind;
  sub?: string;
}

export interface EdgeDef {
  id: string;
  from: string;
  to: string;
  pts: Point[];
  label?: string;
  /** Label position override: [x, y, text-anchor]. */
  lp?: [number, number, "start" | "middle"];
  /** Arrowheads at both ends. */
  both?: boolean;
  /** Dashed line for background / event-driven flows. */
  async?: boolean;
}

/** A hub box that fans out to `members` along a vertical line at `x`. */
export interface BusDef {
  hub: string;
  hubX: number;
  hubY: number;
  x: number;
  members: string[];
  label?: string;
  lp?: [number, number, "start" | "middle"];
}

export interface SceneDef {
  boxes: BoxDef[];
  edges: EdgeDef[];
  bus?: BusDef;
}

// ---- Slides -----------------------------------------------------------------

export interface ArchitectureSlide {
  /** Which entry of `scenes` this slide draws. */
  scene: string;
  /** Box / edge ids this slide adds, in the order they should fade in. */
  add?: string[];
  remove?: string[];
  title: string;
  script: Script;
  delayMs?: number;
  fadeMs?: number;
}
