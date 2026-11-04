// Lists the architecture slides of a deck whose script is longer than a
// sentence limit, in slide order. Used by the expand-deck skill to pick the
// next slide to expand.
//
//   node scripts/long-slides.ts <slug> [--max 5]
//
// Prints one line per long slide: "<url number>\t<sentences>\t<kind>\t<title>".
// The url number is the one in /#/<slug>/<n>, counting the generated intro and
// requirement slides, which are never listed. The last slide is never listed
// either: it is the full-system wrap-up, and a long script there is fine.
import fs from "node:fs";
import path from "node:path";
import type { Deck, Script } from "../src/types.ts";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const maxAt = args.indexOf("--max");
const max = maxAt >= 0 ? Number(args[maxAt + 1]) : 5;
if (!slug || !Number.isFinite(max)) {
  console.error("usage: node scripts/long-slides.ts <slug> [--max 5]");
  process.exit(2);
}

const file = path.join(import.meta.dirname, "..", "public", "decks", `${slug}.json`);
if (!fs.existsSync(file)) {
  console.error(`no deck at ${file}`);
  process.exit(2);
}
const deck: Deck = JSON.parse(fs.readFileSync(file, "utf8"));

// Abbreviations whose period doesn't end a sentence.
const ABBREVIATIONS = /\b(e\.g|i\.e|vs|etc|approx|incl|cf|Mr|Ms|Dr|St)\.(?=\s)/gi;

export function countSentences(script: Script): number {
  return script
    .map((p) => p.replace(/\*/g, "").replace(ABBREVIATIONS, (m) => m.replace(/\./g, "")))
    // A sentence ends at . ! or ? (optionally followed by a closing quote or
    // bracket) before whitespace or the end of the paragraph. Decimals like
    // "1.5" have no space after the dot, so they don't split.
    .flatMap((p) => p.split(/(?<=[.!?]["')\]]?)\s+/))
    .filter((s) => /\w/.test(s)).length;
}

const { functional: fr, nonFunctional: nfr } = deck.requirements;
const generated = 1 + (fr.cards.length + 2) + (nfr.cards.length + 3);

deck.slides.slice(0, -1).forEach((s, i) => {
  const n = countSentences(s.script);
  if (n <= max) return;
  const kind = "scene" in s ? (s.focus ? "focus" : "scene") :
    ["sequence", "entities", "bullets", "table", "timeline"].find((k) => k in s);
  console.log(`${generated + i + 1}\t${n}\t${kind}\t${s.title}`);
});
