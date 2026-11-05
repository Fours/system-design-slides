import type { Deck, Narration, Script } from "../types";

// Narration: every slide's script read aloud. scripts/generate-audio.ts turns
// these texts into audio files under public/audio/<slug>/, and the deck page
// plays them in order, advancing as each one ends.
//
// This module has no runtime imports, so the Node script can load it directly.

/** One entry per slide, in slide order; written by scripts/generate-audio.ts. */
export interface AudioManifest {
  voice: string;
  speed: number;
  slides: { file: string; hash: string; seconds: number }[];
}

export const DEFAULT_NARRATION: Required<Omit<Narration, "say">> = { voice: "am_michael", speed: 1 };

/** The script of every slide, in the same order as buildSlides() in slides.ts. */
export function slideScripts(deck: Deck): Script[] {
  const { functional: fr, nonFunctional: nfr } = deck.requirements;
  const name = deck.title.replace(/^Design\s+/, "");
  return [
    deck.intro?.script ?? [`Welcome to a system design walkthrough for ${name}.`],
    fr.intro.script,
    ...fr.cards.map((c) => c.script),
    fr.outOfScope.script,
    nfr.intro.script,
    ...nfr.cards.map((c) => c.script),
    nfr.estimates.script,
    nfr.takeaway.script,
    ...deck.slides.map((s) => s.script),
  ];
}

const UNITS: Record<string, string> = {
  k: "thousand", K: "thousand", M: "million", B: "billion", T: "trillion",
  ms: "milliseconds", µs: "microseconds", us: "microseconds", s: "seconds",
  KB: "kilobytes", MB: "megabytes", GB: "gigabytes", TB: "terabytes", PB: "petabytes", EB: "exabytes",
  Kbps: "kilobits per second", kbps: "kilobits per second", Mbps: "megabits per second",
  Gbps: "gigabits per second", Tbps: "terabits per second",
};
const PER: Record<string, string> = {
  s: "second", sec: "second", second: "second", min: "minute", minute: "minute", h: "hour", hr: "hour",
  hour: "hour", day: "day", d: "day", wk: "week", week: "week", mo: "month", month: "month",
  yr: "year", year: "year",
};

/** Rewrites one paragraph of markdown-lite into plain text that reads well
 *  aloud: drops the ** and * markers, and spells out symbols, units and
 *  abbreviations. A deck's `narration.say` replacements run first. */
export function speakable(paragraph: string, say: Record<string, string> = {}): string {
  let t = paragraph.replace(/\*/g, "");
  for (const [from, to] of Object.entries(say)) t = t.split(from).join(to);
  return t
    .replace(/\be\.g\.,?/g, "for example,").replace(/\bi\.e\.,?/g, "that is,")
    .replace(/\bvs\.?(?=\s)/g, "versus").replace(/\betc\./g, "et cetera.")
    .replace(/\bA\/B\b/g, "A B").replace(/\bI\/O\b/g, "I O")
    // Ranges and rates.
    .replace(/(\d)\s*[–-]\s*(\d)/g, "$1 to $2")
    .replace(/\/(\w+)\b/g, (m, w: string) => (PER[w] ? ` per ${PER[w]}` : m))
    // Numbers with a unit glued on: 10M, 1.5B, 200ms, 4KB, 50k+.
    .replace(/(\d)\s?(Kbps|kbps|Mbps|Gbps|Tbps|KB|MB|GB|TB|PB|EB|ms|µs|us|k|K|M|B|T)\b/g, (_, d, u: string) => `${d} ${UNITS[u]}`)
    .replace(/(\d|thousand|million|billion|trillion)\+/g, "$1 plus").replace(/\b([A-Z])\+(\d)/g, "$1 plus $2").replace(/(\d)\s\+\s(?=\d)/g, "$1 plus ")
    .replace(/~\s?(?=[\d$])/g, "about ").replace(/≈\s?/g, "about ")
    .replace(/(\d)\s?×\s?(?=\d)/g, "$1 times ").replace(/(\d)×/g, "$1 times").replace(/×/g, " times ")
    .replace(/≤\s?/g, "at most ").replace(/≥\s?/g, "at least ")
    .replace(/<\s?(?=[\d$])/g, "under ").replace(/>\s?(?=[\d$])/g, "over ")
    .replace(/\s?(→|->)\s?/g, " to ").replace(/\s?←\s?/g, " from ")
    .replace(/\s?=\s?/g, " equals ").replace(/\s?&\s?/g, " and ")
    .replace(/\s?[—–]\s?/g, ", ").replace(/…/g, "...")
    .replace(/(\w)\/(\w)/g, "$1 or $2").replace(/\bms\b/g, "milliseconds")
    .replace(/\s{2,}/g, " ")
    .trim();
}
