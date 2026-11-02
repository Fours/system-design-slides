---
name: expand-slide
description: Split one architecture slide of a system design deck into several shorter slides, adding detail diagrams (sequence, UML entities, bullets, comparison table, focus/trace, zoom-in scene) between the steps of the main diagram. Takes a deck slug and a slide number, proposes a plan, and edits only after the user approves. Use when the user says "expand slide N of <deck>", "/expand-slide spotify 30", or asks to break up a long slide.
argument-hint: <deck-slug> <slide-number>
---

# expand-slide

Split one long architecture slide into 2 or more slides so that **every couple of
sentences, the diagram shows something new and useful**. The main scene's build-up
is never disturbed: new slides are inserted *between* its steps.

Arguments: `<deck-slug> <slide-number>`, e.g. `spotify 30`. The number is the one in
the URL (`/#/spotify/30`), which counts the generated requirement slides.

**Phase 1 (read and propose) never edits files. Phase 2 starts only after the user
approves the plan in chat.**

## Phase 1: read and propose

### 1. Find the slide

Read `public/decks/<slug>.json` (and skim `CLAUDE.md` for the deck conventions).
Map the URL number to an entry of `slides`:

```
requirementSlides = (functional.cards.length + 2) + (nonFunctional.cards.length + 3)
index into slides = slideNumber - requirementSlides - 1
```

If the number lands on a requirement slide, stop and say so: those are generated, one
card per slide, and are out of scope. If the target is already a detail slide (no
`scene`), say so and ask whether to continue.

Note what is on screen: replay `add` / `remove` for the slide's scene up to and
including the target, and list the visible boxes and edges and which ones are new on
this slide. Also read the previous and next slides' scripts for continuity.

### 2. Split the script into beats

Break the script into **beats** of about 2–3 sentences (roughly 40–60 words), each
one idea. A 250-word slide usually yields 4–6 beats. Keep the original wording; only
add short transitions where a cut would otherwise read abruptly. Every sentence of the
original ends up in exactly one new slide, in order.

### 3. Pick a diagram for each beat

**The first beat stays on the original scene slide** with its full `add` / `remove`,
so the new box appears first and the detail slides explain it. (Optionally, the step
may be spread over 2–3 scene slides that each add part of the `add` list: the box
first, then its edges. Keep the same elements and fade-in order overall.)

For each remaining beat, choose the diagram that best shows *that beat*. Available
slide kinds (all data-only, documented in `src/types.ts`):

| Kind | JSON key | Best for |
|------|----------|----------|
| Sequence diagram | `sequence` | a request/response flow, a protocol, a retry or failure path, ordering of writes |
| UML entities | `entities` | a schema, a data model, an event or message payload, key design |
| Bullets | `bullets` | a list of reasons, rules, guarantees, or trade-offs |
| Comparison table | `table` | choosing between options (databases, protocols, strategies) |
| Focus / trace | `scene` + `focus` | following one path through the current diagram, pointing at the boxes a beat talks about |
| Zoom-in | a new entry in `scenes` | the inside of one box (shards, replicas, internal workers), see "Multiple scenes" in CLAUDE.md |

Other ideas are welcome when they fit better: a sub-scene for a failure mode
(a ghost/dashed box for the failed node), a "before vs after" pair of focus slides, a
table of capacity numbers. If an idea needs a **new reusable slide kind**, propose it
as a separate, clearly flagged item (shared code + `src/types.ts` + validator), never
a one-off hack in one deck.

Guidelines:
- Prefer variety, but choose by usefulness, not novelty. Two focus slides in a row
  are fine if they trace two different paths.
- Each detail slide shows only what its beat says. Use names that match the main
  scene's labels so the audience can map one to the other.
- Don't introduce components the main diagram hasn't added yet, unless the beat is
  explicitly foreshadowing.
- Respect the size limits the validator warns about: ≤ 6 actors and ≤ 12 steps per
  sequence; ≤ 5 entities; ≤ 6 bullets of ≤ 64 characters; ≤ 8 table rows, cells short
  enough that a row is ≤ ~120 characters.
- If the target is the **last slide of the deck**, the deck must still end on the
  complete main scene: end the group with a scene slide that has no `add` (a recap),
  or keep the original scene slide last.

### 4. Propose the plan, then stop

Present a table, one row per resulting slide:

| # | Kind | Title | What the diagram shows | Script (first words … last words, ~N words) |
|---|------|-------|------------------------|---------------------------------------------|

Then list: the new slide count for this group (and the deck total), any new scene
or shared-code changes, and any script edits beyond splitting (new transitions).
Ask the user to approve or adjust. **Do not edit anything until they approve.**

## Phase 2: apply (after approval)

1. Edit `public/decks/<slug>.json` by text insertion (Edit tool), matching the
   file's existing formatting. Don't rewrite the whole file with a JSON serializer,
   which reformats every line.
   - Keep the original scene slide's `scene` / `add` / `remove`, and trim its
     `script` to the first beat. Give it a title that fits that beat.
   - Insert the new slides after it, in order. Detail slides have no `scene` key;
     scene-step state carries across them automatically.
   - A focus slide is `{ "scene": "main", "focus": [ids], "title", "script" }`;
     every focused id must already be visible.
   - Sequences with many steps animate slowly at the default 1000 ms per step; set
     `"fadeMs": 500` on that slide when there are more than ~6 steps.
2. Run `npm run validate` and fix every error and every warning on the slides you
   touched.
3. Visually check every new slide at 1440×900. Use the `dev` preview from
   `.claude/launch.json` (or headless Chrome screenshots of `/#/<slug>/<n>`), wait
   for the fade-ins to finish, and check for overlapping text, clipped labels, or
   cramped layouts. Fix and re-check.
4. Report: the new slide numbers for this group (for example "30 → 30–35"), and that
   every slide after the group has shifted by +N. If the user plans to expand
   another slide later in the same deck, its number has changed.
