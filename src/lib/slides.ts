import type { ArchitectureSlide, Deck, Script } from "../types";
import { layoutBullets, layoutEntities, layoutSequence, layoutTable, layoutTimeline,
  type BulletsFrame, type EntitiesFrame, type SequenceFrame, type TableFrame, type TimelineFrame } from "./detail";
import { sceneBuilder, type SceneFrame } from "./scene";

// Turns a deck's JSON into the flat list of slides the engine shows.
//
// The deck opens with a generated intro slide: the complete main scene (its
// state after the last slide, with nothing highlighted as new) and a one-line
// welcome, or the deck's own `intro`. Requirement slides always follow the
// same sequence, so they are generated from `requirements`:
//   - functional:     title-only, one per card, out-of-scope strip
//   - non-functional: title-only, one per card, estimates, takeaway
// The architecture slides follow, one per entry of `slides`: scene steps, and
// the detail slides (sequence, entities, bullets, table, timeline) between them.

export type Diagram =
  | { kind: "fr"; show: number; withStrip: boolean }
  | { kind: "nfr"; show: number; withEstimates: boolean; withTakeaway: boolean }
  | { kind: "scene"; frame: SceneFrame }
  | { kind: "sequence"; frame: SequenceFrame }
  | { kind: "entities"; frame: EntitiesFrame }
  | { kind: "bullets"; frame: BulletsFrame }
  | { kind: "table"; frame: TableFrame }
  | { kind: "timeline"; frame: TimelineFrame };

export interface Slide {
  title: string;
  script: Script;
  diagram: Diagram;
  delayMs: number;
  fadeMs: number;
}

export const DEFAULT_ANIMATION = { delayMs: 1000, fadeMs: 1000 };

export function buildSlides(deck: Deck): Slide[] {
  const { delayMs, fadeMs } = deck.animation ?? DEFAULT_ANIMATION;
  const { functional: fr, nonFunctional: nfr } = deck.requirements;
  const slides: Slide[] = [];
  const push = (title: string, script: Script, diagram: Diagram) =>
    slides.push({ title, script, diagram, delayMs, fadeMs });

  // Intro: replay every step of the main scene (or the first scene) on a
  // throwaway builder, then take one more step that adds nothing.
  const introScene = "main" in deck.scenes ? "main" : Object.keys(deck.scenes)[0];
  const finalStep = sceneBuilder(deck.scenes[introScene]);
  deck.slides.forEach((s) => {
    if ("scene" in s && s.scene === introScene) finalStep({ add: s.add, remove: s.remove });
  });
  const name = deck.title.replace(/^Design\s+/, "");
  push(deck.intro?.title ?? deck.title, deck.intro?.script ?? [`Welcome to a system design walkthrough for ${name}.`],
    { kind: "scene", frame: finalStep() });

  const frD = (show: number, withStrip = false): Diagram => ({ kind: "fr", show, withStrip });
  push(fr.intro.title, fr.intro.script, frD(0));
  fr.cards.forEach((c, i) => push(c.title, c.script, frD(i + 1)));
  push(fr.outOfScope.title, fr.outOfScope.script, frD(fr.cards.length, true));

  const nfrD = (show: number, withEstimates = false, withTakeaway = false): Diagram =>
    ({ kind: "nfr", show, withEstimates, withTakeaway });
  const n = nfr.cards.length;
  push(nfr.intro.title, nfr.intro.script, nfrD(0));
  nfr.cards.forEach((c, i) => push(c.title, c.script, nfrD(i + 1)));
  push(nfr.estimates.title, nfr.estimates.script, nfrD(n, true));
  push(nfr.takeaway.title, nfr.takeaway.script, nfrD(n, true, true));

  // One stateful builder per scene; each keeps its state while another scene
  // is on screen, so a deep dive returns to the main scene where it left off.
  const builders = new Map(Object.entries(deck.scenes).map(([name, def]) => [name, sceneBuilder(def)]));
  // Detail slides leave every scene's state alone.
  const diagramOf = (s: ArchitectureSlide): Diagram => {
    if ("sequence" in s) return { kind: "sequence", frame: layoutSequence(s.sequence) };
    if ("entities" in s) return { kind: "entities", frame: layoutEntities(s.entities) };
    if ("bullets" in s) return { kind: "bullets", frame: layoutBullets(s.bullets, s.title) };
    if ("table" in s) return { kind: "table", frame: layoutTable(s.table, s.title) };
    if ("timeline" in s) return { kind: "timeline", frame: layoutTimeline(s.timeline, s.title) };
    const step = builders.get(s.scene);
    if (!step) throw new Error(`Unknown scene "${s.scene}" on slide "${s.title}"`);
    return { kind: "scene", frame: step({ add: s.add, remove: s.remove, focus: s.focus }) };
  };
  deck.slides.forEach((s) => {
    slides.push({
      title: s.title,
      script: s.script,
      diagram: diagramOf(s),
      delayMs: s.delayMs ?? delayMs,
      fadeMs: s.fadeMs ?? fadeMs,
    });
  });

  return slides;
}
