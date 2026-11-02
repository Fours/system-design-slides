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

interface SlideBase {
  title: string;
  script: Script;
  delayMs?: number;
  fadeMs?: number;
}

/** A step of a scene: adds / removes elements, or spotlights some of them. */
export interface SceneSlide extends SlideBase {
  /** Which entry of `scenes` this slide draws. */
  scene: string;
  /** Box / edge ids this slide adds, in the order they should fade in. */
  add?: string[];
  remove?: string[];
  /** Box / edge ids to spotlight: every other visible element is dimmed.
   *  Leaves the scene's state alone, so it suits "trace this path" slides. */
  focus?: string[];
}

/** A sequence diagram: actor lifelines, then numbered messages top to bottom. */
export interface SequenceSlide extends SlideBase {
  sequence: {
    /** Lifelines, left to right. `kind` colors the header box like a scene box. */
    actors: { id: string; label: string; kind: BoxKind; sub?: string }[];
    /** Messages (`from` → `to`; `from === to` is a self-call; `reply` is dashed)
     *  or notes spanning the `over` actors. Revealed one at a time. */
    steps: SequenceStep[];
  };
}

export type SequenceStep =
  | { from: string; to: string; label: string; reply?: boolean }
  | { note: string; over: string[] };

/** UML-style entities in a row, with labeled relations between them. */
export interface EntitiesSlide extends SlideBase {
  entities: {
    /** Each entity: a name and its fields ("id: uuid  PK"), shown left to right. */
    items: { id: string; name: string; kind?: BoxKind; fields: string[] }[];
    /** Associations, e.g. { from: "user", to: "order", label: "1 — *" }. */
    relations?: { from: string; to: string; label?: string }[];
  };
}

/** A heading and bullet points (markdown-lite), revealed one at a time. */
export interface BulletsSlide extends SlideBase {
  bullets: {
    /** Defaults to the slide title. */
    heading?: string;
    /** A bullet, or a bullet with a dimmed detail line under it. */
    items: (string | { text: string; detail?: string })[];
  };
}

/** A comparison table (markdown-lite cells), rows revealed one at a time. */
export interface TableSlide extends SlideBase {
  table: {
    /** Defaults to the slide title. */
    heading?: string;
    columns: string[];
    rows: string[][];
    /** Index of a row to highlight, e.g. the option we chose. */
    highlight?: number;
  };
}

export type ArchitectureSlide = SceneSlide | SequenceSlide | EntitiesSlide | BulletsSlide | TableSlide;
