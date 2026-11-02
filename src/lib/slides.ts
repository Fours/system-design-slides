import type { Deck, Script } from "../types";
import { sceneBuilder, type SceneFrame } from "./scene";

// Turns a deck's JSON into the flat list of slides the engine shows.
//
// Requirement slides always follow the same sequence, so they are generated
// from `requirements`:
//   - functional:     title-only, one per card, out-of-scope strip
//   - non-functional: title-only, one per card, estimates, takeaway
// The architecture slides follow, one per entry of `slides`.

export type Diagram =
  | { kind: "fr"; show: number; withStrip: boolean }
  | { kind: "nfr"; show: number; withEstimates: boolean; withTakeaway: boolean }
  | { kind: "scene"; frame: SceneFrame };

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
  deck.slides.forEach((s) => {
    const step = builders.get(s.scene);
    if (!step) throw new Error(`Unknown scene "${s.scene}" on slide "${s.title}"`);
    slides.push({
      title: s.title,
      script: s.script,
      diagram: { kind: "scene", frame: step({ add: s.add, remove: s.remove }) },
      delayMs: s.delayMs ?? delayMs,
      fadeMs: s.fadeMs ?? fadeMs,
    });
  });

  return slides;
}
