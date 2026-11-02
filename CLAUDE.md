# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Purpose

This project produces **system design walkthrough slide decks**. Each deck answers a
single systems-design interview question of the form **"Design X."** (e.g. "Design
Spotify.", "Design a chat bot.") the way a senior engineer would at a whiteboard:

- A **diagram** — the boxes, labels, and arrows the engineer would draw.
- A **script** — what the engineer would say out loud to explain that diagram.

A deck walks through the design **incrementally**: each slide adds exactly one more
layer, entity, or concept to the diagram and explains it. The requirement slides
come first; then the diagram starts from the simplest possible system and grows until
the last slide shows the complete system.

## Project layout

A React + Vite + TypeScript app. Every deck is **data only**: a JSON file that the
app fetches at runtime, like an API response. All rendering code is shared.

- `public/decks/index.json`: the decks listed on the home page, each
  `{ slug, title, description }`.
- `public/decks/<slug>.json`: one deck. The slug is the **topic name, kebab-cased**,
  e.g. `"chat bot"` → `chat-bot.json`, `"Google Docs"` → `google-docs.json`.
- `src/types.ts`: the JSON formats (`DeckIndex`, `Deck`), with comments on every field.
- `src/lib/slides.ts` expands a deck into its slides; `src/lib/scene.ts` is the scene
  builder; `src/components/` holds the diagrams, the deck page, and the index page.
- `scripts/validate-decks.ts`: checks every deck JSON.

Routes use the URL hash: `/#/` is the index, `/#/<slug>/<n>` is slide `n` of a deck.

Commands: `npm run dev` (local server), `npm run validate` (check decks),
`npm run build` (type-check and build to `dist/`).

## Slide deck structure

Every deck shares the same look, feel, and features.

### Template

The template deck is `public/decks/example.json` (viewable at `/#/example`; it is
not listed on the index page). **Start every new deck by copying it** to
`public/decks/<slug>.json`, then replace:

1. `title` ("Design X") and `topic` (the badge, "System Design: X").
2. `requirements`: the `functional` and `nonFunctional` intro, cards, out-of-scope
   strip, estimates, and takeaway.
3. `scenes`: every box and edge of the **final** system (usually just `main`).
4. `slides`: one entry per architecture step.

Then add the deck to `index.json` with a one-sentence description.

Decks contain only data, so every deck behaves identically. If a deck needs a new
reusable feature, add it to the shared code (and `src/types.ts`) and use it from the
JSON. Never special-case one deck in code.

### Layout (per slide)

- **Top (large) section:** the system diagram — labeled boxes, lines, and arrows
  showing components and how they interact.
- **Bottom (smaller) section:** the **script** for the diagram above it.
  - The script section has a **header** showing the **slide number** and a **title**
    for that part of the script.
  - The body is what the engineer would say to explain the current diagram.

### Navigation

- A **back arrow** and a **forward arrow** on screen to move between slides.
- **Left/Right arrow keys** also navigate between slides.
- The slide number is in the URL (`/#/<slug>/<n>`), so links and refreshes keep it.
- A round **home** button, left of the arrows, links back to the index of all decks.

### Progression

The requirement slides are **generated** from `requirements`; don't list them in
`slides`.

- **Functional requirements, built up one slide at a time:**
  - a title-only slide (`functional.intro`);
  - one slide per numbered card (`functional.cards`, one per capability, up to 9),
    each adding the next card, highlighted as new; its script describes just that
    requirement, and the slide is titled with the card title;
  - one slide adding the dashed strip listing what is out of scope
    (`functional.outOfScope`).
  With 6 cards these are slides 1–8.
- **Non-functional requirements, built up the same way:**
  - a title-only slide (`nonFunctional.intro`);
  - one slide per card (`nonFunctional.cards`: scale, latency, availability,
    durability, consistency, cost, ...), each adding the next card;
  - one slide adding the back-of-the-envelope panel (`nonFunctional.estimates`;
    `rows` of `[heading, [value, ...]]`, and an optional `height` if the numbers
    need more or less room than the card grid);
  - one slide adding the takeaway panel, the numbers that shape the design
    (`nonFunctional.takeaway`; optional `heading`, default "Takeaway").
  With 6 cards these are slides 9–17.
- **Architecture slides** (`slides`) follow:
  - **First:** the simplest starting point for the diagram, e.g. one client and one
    server.
  - **Each subsequent slide:** adds one more layer/entity/concept to the diagram and
    explains it in the script.
  - **Final slide:** the full diagram of the complete system.

### Workflow for a new deck

1. **Agree on requirements first.** Before building, propose broad functional and
   non-functional requirements, with rough scale numbers and what is out of scope, and
   check them with the user. The agreed list becomes the requirement slides.
2. Sketch the **final** architecture and the order in which pieces get added. A large
   subsystem can get its own sub-arc (see "Multiple scenes" below).
3. Copy the template, lay out `scenes`, write `slides`, and add the deck to
   `index.json`.
4. Run `npm run validate` and fix every error (unknown ids, edges to missing boxes,
   unclosed markdown) and warning.
5. Run `npm run dev` and check every slide visually at 1440×900: no overlapping boxes,
   no edges running through boxes, labels readable. Headless Chrome screenshots of
   `/#/<slug>/<n>` work well for this.

## Building diagrams with the scene builder

Architecture diagrams are **not** hand-written per slide. Instead:

1. **Declare the final system once** in `scenes.main`. Give every box and edge the
   position it has in the complete diagram:
   - Box: `{ id, x, y, w, h, label, kind, sub }`
   - Edge: `{ id, from, to, pts: [[x, y], ...], label?, lp?, both?, async? }`
   - Optional `bus`: a hub box (API gateway, load balancer) that fans out to `members`
     along a vertical line. Members join the bus automatically as they appear.
2. **Each slide says only what it adds:**
   `{ "scene": "main", "add": [...ids], "remove": [...ids], "title", "script" }`.
   Visibility is cumulative from slide to slide. Use `remove` sparingly, for example when a monolithic "server" is split into services
   (its edges disappear automatically once an endpoint is gone).

What the builder does for you:

- **Highlights what's new.** Boxes added on the current slide get a thick, glowing
  accent outline. New edges and their labels turn the accent color. This is how the
  audience spots "the one new thing" on each slide, so every slide should add at least
  one element.
- **Animates what's new.** On arriving at a slide, after a short pause, the new
  elements fade in one at a time **in the order they are listed in `add`**, so list
  ids in the order you'd draw them (an edge never appears before a new box it
  connects to). Timing defaults to 1000 ms each; a deck can set
  `animation: { delayMs, fadeMs }`, and a slide can override either with its own
  `delayMs` / `fadeMs`.
- **Hides dangling edges.** An edge is drawn only if it was added and both endpoints
  are visible.
- **Auto-fits the camera.** The `viewBox` fits whatever is visible, with a minimum
  size, so early slides aren't tiny and the view widens as the system grows.

Box `kind` sets the color, and an optional modifier sets the style:

| kind      | used for                                  |
|-----------|-------------------------------------------|
| `client`  | users, client apps, external actors       |
| `service` | application services, workers             |
| `data`    | databases, blob stores, caches            |
| `infra`   | API gateways, load balancers, CDN, DNS    |
| `stream`  | queues, Kafka, stream processing          |
| `ml`      | ML models, batch/training pipelines       |
| `+ tier`  | a pass-through layer drawn *behind* edges (e.g. `"data tier"` for a cache tier) |
| `ghost`   | dashed box for things that exist but aren't designed (third parties, other regions) |

Edge flags: `both` gives arrowheads at both ends, `async` gives a dashed line for
background or event-driven flows, and `lp: [x, y, "start" | "middle"]` overrides the
automatic label position.

Layout guidance:

- Lay the final diagram out in **columns** (e.g. clients | edge/infra | services | cache
  | data | async/analytics) with a fixed **row pitch** (~70px for 54px-tall boxes), so
  that most edges are straight horizontal lines between neighbors.
- Keep the canvas **wide and short** (roughly 2:1 or wider), because the diagram
  panel is much wider than it is tall. Dense final diagrams get small on a laptop
  screen, so prefer fewer, well-named boxes over many tiny ones.
- Route edges that would cross a box as **polylines** through the gaps between
  columns. Occasional crossings are fine; edges passing *through* boxes are not.
- Keep labels short enough for their box (~8px per character for 15px bold labels; the
  `sub` line is 11px).
- A box that exists only early on (like the slide-3 "server") can occupy space that
  later boxes take over, as long as it's removed before they appear.

### Multiple scenes

For a deep dive into one subsystem (e.g. the `recs` scene in `spotify.json`), declare
a second entry in `scenes` and point a run of slides at it with `"scene": "recs"`. Show the subsystem as a single box in the main scene first, zoom
into it, then return to the main scene, whose state picks up where it left off.

## Writing the script

Every `script` is an array of paragraphs in **markdown-lite**: `**bold**` for the key
terms, and `*text*` for dimmed asides. Those two markers (which can nest) are the only
formatting; there is no HTML.

The concatenation of every slide's script section is a single, continuous answer to
"Design X." Write it accordingly.

- **Target length:** aim for a script that takes about **30 minutes to read aloud**.
  For complicated topics that need more room, aim for **30–60 minutes**.
- **Altitude:** stay at the **high level** — systems-level components and how they
  interact. Avoid low-level code detail.
- **Explain the "why", not just the "what":** justify design choices, call out
  trade-offs, and describe alternative options where appropriate.
- **One step at a time:** each slide's script should correspond to the one new thing
  that slide's diagram introduces, building naturally on the previous slides.

## Consistency

When creating a new deck, match the existing decks in `public/decks/` for visual style,
layout, navigation behavior, and script conventions so every deck feels like part of
the same series.
