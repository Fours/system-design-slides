// Checks public/decks/*.json for mistakes the app would render silently:
// unknown ids, edges to missing boxes, unbalanced markdown, and so on.
//
//   npm run validate
//
// Errors exit non-zero; warnings are style issues from CLAUDE.md.
import fs from "node:fs";
import path from "node:path";
import type { ArchitectureSlide, Deck, DeckIndex, SceneDef } from "../src/types.ts";
import { REQ_H, nfrLayout } from "../src/lib/requirements.ts";
import { layoutTimeline } from "../src/lib/detail.ts";

const DIR = path.join(import.meta.dirname, "..", "public", "decks");
let errors = 0, warnings = 0;
const error = (where: string, msg: string) => { errors++; console.log(`  error   ${where}: ${msg}`); };
const warn = (where: string, msg: string) => { warnings++; console.log(`  warning ${where}: ${msg}`); };

const read = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));

// Markdown-lite: every ** and * must be closed.
function checkScript(where: string, script: unknown) {
  if (!Array.isArray(script) || script.some((p) => typeof p !== "string")) {
    error(where, "script must be an array of paragraph strings");
    return;
  }
  script.forEach((p: string, i) => {
    const stars = p.replace(/\*\*/g, "").split("*").length - 1;
    const doubles = p.split("**").length - 1;
    if (stars % 2 || doubles % 2) error(where, `paragraph ${i + 1} has an unclosed * or **`);
  });
}

const plain = (s: string) => s.replace(/\*/g, "");
const KINDS = ["scene", "sequence", "entities", "bullets", "table", "timeline"] as const;

// A detail slide (anything but a scene step): checks its own data.
function checkDetail(at: string, s: ArchitectureSlide) {
  if ("sequence" in s) {
    const { actors, steps } = s.sequence;
    const ids = new Set(actors.map((a) => a.id));
    if (ids.size !== actors.length) error(at, "duplicate actor id");
    if (actors.length > 6) warn(at, `${actors.length} actors; more than 6 gets cramped`);
    if (steps.length > 12) warn(at, `${steps.length} steps; more than 12 gets cramped, so split the slide`);
    steps.forEach((st, i) => {
      const refs = "note" in st ? st.over : [st.from, st.to];
      refs.forEach((id) => { if (!ids.has(id)) error(at, `step ${i + 1} references unknown actor "${id}"`); });
      checkScript(`${at} step ${i + 1}`, ["note" in st ? st.note : st.label]);
    });
  } else if ("entities" in s) {
    const { items, relations = [] } = s.entities;
    const ids = new Set(items.map((e) => e.id));
    if (ids.size !== items.length) error(at, "duplicate entity id");
    if (items.length > 5) warn(at, `${items.length} entities; more than 5 gets small`);
    relations.forEach((r) => [r.from, r.to].forEach((id) => {
      if (!ids.has(id)) error(at, `relation references unknown entity "${id}"`);
    }));
  } else if ("bullets" in s) {
    const items = s.bullets.items.map((b) => (typeof b === "string" ? { text: b, detail: undefined } : b));
    if (!items.length) error(at, "bullets has no items");
    if (items.length > 6) warn(at, `${items.length} bullets; more than 6 gets cramped`);
    items.forEach(({ text, detail }, i) => {
      checkScript(`${at} bullet ${i + 1}`, detail ? [text, detail] : [text]);
      if (plain(text).length > 64) warn(at, `bullet ${i + 1} is longer than 64 characters and may run off the slide`);
      if (detail && plain(detail).length > 100) warn(at, `bullet ${i + 1} detail is longer than 100 characters`);
    });
  } else if ("table" in s) {
    const { columns, rows, highlight } = s.table;
    rows.forEach((r, i) => {
      if (r.length !== columns.length) error(at, `table row ${i + 1} has ${r.length} cells; expected ${columns.length}`);
      checkScript(`${at} table row ${i + 1}`, r);
    });
    if (rows.length > 8) warn(at, `${rows.length} table rows; more than 8 gets cramped`);
    const chars = columns.reduce((n, c, j) => n + Math.max(plain(c).length, ...rows.map((r) => plain(r[j] ?? "").length)), 0);
    if (chars > 120) warn(at, `table rows are ~${chars} characters wide and may overflow; shorten the cells`);
    if (highlight !== undefined && !rows[highlight]) error(at, `highlight ${highlight} is not a row index`);
  } else if ("timeline" in s) {
    const { axis, lanes, marks } = s.timeline;
    if (!(axis.to > axis.from)) error(at, "timeline axis needs to > from");
    const inAxis = (t: number) => t >= axis.from && t <= axis.to;
    (axis.ticks ?? []).forEach((t) => { if (!inAxis(t)) error(at, `tick ${t} is outside the axis`); });
    const byId = new Map(lanes.map((l) => [l.id, l]));
    if (byId.size !== lanes.length) error(at, "duplicate lane id");
    if (!lanes.length) error(at, "timeline has no lanes");
    lanes.forEach((l) => {
      checkScript(`${at} lane "${l.id}"`, l.sub ? [l.label, l.sub] : [l.label]);
      if (plain(l.label).length > 24) warn(at, `lane label "${l.label}" is longer than 24 characters`);
    });
    if (marks.length > 16) warn(at, `${marks.length} marks; more than 16 gets slow to reveal, so split the slide`);
    marks.forEach((m, i) => {
      const mk = `${at} mark ${i + 1}`;
      if ("note" in m) {
        checkScript(mk, [m.note]);
        if (!m.at.every(inAxis) || m.at[1] < m.at[0]) error(mk, "note range must be inside the axis, from <= to");
        if (plain(m.note).length > 80) warn(mk, "note is longer than 80 characters");
        return;
      }
      const lane = byId.get(m.lane);
      if (!lane) { error(mk, `unknown lane "${m.lane}"`); return; }
      if ("span" in m) {
        if (!m.span.every(inAxis) || m.span[1] <= m.span[0]) error(mk, "span must be inside the axis, from < to");
      } else if ("level" in m) {
        if (!lane.max) error(mk, `level line on lane "${m.lane}", which has no "max"`);
        m.level.forEach(([t, v]) => {
          if (!inAxis(t)) error(mk, `level point at t=${t} is outside the axis`);
          if (lane.max && (v < 0 || v > lane.max)) error(mk, `level value ${v} is outside 0..${lane.max}`);
        });
        if (m.level.some(([t], k) => k > 0 && t < m.level[k - 1][0])) error(mk, "level points must be in time order");
      } else {
        if (!inAxis(m.at)) error(mk, `request at t=${m.at} is outside the axis`);
        if (lane.max) warn(mk, `request on lane "${m.lane}", which is a level lane; use a separate lane`);
      }
    });
    const [, , , h] = layoutTimeline(s.timeline, s.title).viewBox.split(" ").map(Number);
    if (h > 760) warn(at, `timeline is ${h} units tall and will look small; use fewer lanes or notes`);
  }
}

function checkScene(where: string, scene: SceneDef) {
  const ids = new Set<string>();
  for (const x of [...scene.boxes, ...scene.edges]) {
    if (ids.has(x.id)) error(where, `duplicate id "${x.id}"`);
    ids.add(x.id);
  }
  const boxes = new Set(scene.boxes.map((b) => b.id));
  for (const e of scene.edges) {
    if (!boxes.has(e.from)) error(where, `edge "${e.id}" starts at unknown box "${e.from}"`);
    if (!boxes.has(e.to)) error(where, `edge "${e.id}" ends at unknown box "${e.to}"`);
    if (e.pts.length < 2) error(where, `edge "${e.id}" needs at least 2 points`);
  }
  if (scene.bus) {
    for (const id of [scene.bus.hub, ...scene.bus.members]) {
      if (!boxes.has(id)) error(where, `bus references unknown box "${id}"`);
    }
  }
  for (const b of scene.boxes) {
    // ~8px per character for 15px bold labels.
    if (b.label.length * 8 > b.w - 8) warn(where, `label "${b.label}" may not fit its ${b.w}px box`);
  }
}

function checkDeck(slug: string, deck: Deck) {
  const where = `${slug}.json`;
  const missing = (["title", "topic", "requirements", "scenes", "slides"] as const).filter((k) => !deck[k]);
  missing.forEach((k) => error(where, `missing "${k}"`));
  if (missing.length) return;

  const { functional: fr, nonFunctional: nfr } = deck.requirements;
  for (const [name, req] of [["functional", fr], ["nonFunctional", nfr]] as const) {
    checkScript(`${where} ${name}.intro`, req.intro.script);
    if (req.cards.length > 9) error(where, `${name} has ${req.cards.length} cards; at most 9 fit`);
    req.cards.forEach((c, i) => {
      checkScript(`${where} ${name}.cards[${i}]`, c.script);
      if (c.lines.length > 3) warn(where, `${name} card "${c.title}" has more than 3 lines`);
    });
  }
  const emoji = fr.intro.emoji;
  if (!emoji) warn(where, `functional.intro has no "emoji"; add 2–3 that convey what the system is about`);
  else if (emoji.length < 2 || emoji.length > 3) error(where, `functional.intro.emoji has ${emoji.length} entries; use 2–3`);
  checkScript(`${where} functional.outOfScope`, fr.outOfScope.script);
  checkScript(`${where} nonFunctional.estimates`, nfr.estimates.script);
  checkScript(`${where} nonFunctional.takeaway`, nfr.takeaway.script);
  const { bottom } = nfrLayout(nfr);
  if (bottom > REQ_H - 4) warn(where, `non-functional takeaway ends at y=${bottom}, below the ${REQ_H}px slide; trim estimates rows or takeaway lines`);

  for (const [name, scene] of Object.entries(deck.scenes)) checkScene(`${where} scenes.${name}`, scene);

  // Replay the slides to check every add / remove against what is visible.
  const visible = new Map(Object.keys(deck.scenes).map((n) => [n, new Set<string>()]));
  const shown = new Map(Object.keys(deck.scenes).map((n) => [n, new Set<string>()]));
  deck.slides.forEach((s, i) => {
    const at = `${where} slide "${s.title}" (#${i + 1} of slides)`;
    checkScript(at, s.script);
    const kinds = KINDS.filter((k) => k in s);
    if (kinds.length !== 1) { error(at, `needs exactly one of ${KINDS.join(", ")}`); return; }
    if (!("scene" in s)) { checkDetail(at, s); return; }
    const scene = deck.scenes[s.scene];
    if (!scene) { error(at, `unknown scene "${s.scene}"`); return; }
    const vis = visible.get(s.scene)!;
    const known = new Set([...scene.boxes, ...scene.edges].map((x) => x.id));
    for (const id of s.remove ?? []) {
      if (!vis.has(id)) error(at, `removes "${id}", which is not visible`);
      vis.delete(id);
    }
    for (const id of s.add ?? []) {
      if (!known.has(id)) error(at, `adds unknown id "${id}"`);
      else if (vis.has(id)) warn(at, `adds "${id}", which is already visible`);
      vis.add(id);
      shown.get(s.scene)!.add(id);
    }
    for (const id of s.focus ?? []) {
      if (!vis.has(id)) error(at, `focuses "${id}", which is not visible`);
    }
    if (!s.add?.length && !s.focus?.length && i < deck.slides.length - 1) {
      warn(at, "adds nothing; every scene slide should add (or focus) at least one element");
    }
    for (const e of scene.edges) {
      if (s.add?.includes(e.id) && !(vis.has(e.from) && vis.has(e.to))) {
        warn(at, `adds edge "${e.id}" before both of its boxes are visible`);
      }
    }
  });
  for (const [name, scene] of Object.entries(deck.scenes)) {
    const never = [...scene.boxes, ...scene.edges].filter((x) => !shown.get(name)!.has(x.id)).map((x) => x.id);
    if (never.length) warn(`${where} scenes.${name}`, `never shown: ${never.join(", ")}`);
  }
}

const index = read<DeckIndex>("index.json");
console.log("index.json");
const listed = new Set<string>();
const sectionIds = new Set<string>();
if (!Array.isArray(index.sections) || index.sections.length === 0) error("index.json", "needs a non-empty \"sections\" array");
for (const s of index.sections ?? []) {
  if (!s.id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)) error("index.json", `section "${s.title}" needs a kebab-case id`);
  if (sectionIds.has(s.id)) error("index.json", `duplicate section id "${s.id}"`);
  sectionIds.add(s.id);
  if (!s.title || !s.description) error("index.json", `section "${s.id}" needs a title and a description`);
  if (!Array.isArray(s.decks)) error("index.json", `section "${s.id}" needs a "decks" array (it may be empty)`);
}
for (const d of (index.sections ?? []).flatMap((s) => s.decks ?? [])) {
  if (listed.has(d.slug)) error("index.json", `"${d.slug}" is listed more than once`);
  listed.add(d.slug);
  if (!d.title || !d.description) error("index.json", `"${d.slug}" needs a title and a description`);
  if (!fs.existsSync(path.join(DIR, `${d.slug}.json`))) error("index.json", `no file ${d.slug}.json`);
}

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "index.json").sort()) {
  const slug = file.slice(0, -5);
  console.log(file);
  if (!listed.has(slug) && slug !== "example") warn(file, "not listed in index.json");
  try {
    checkDeck(slug, read<Deck>(file));
  } catch (e) {
    error(file, (e as Error).message);
  }
}

console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
