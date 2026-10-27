# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Purpose

This project produces **system design walkthrough slide decks**. Each deck answers a
single systems-design interview question of the form **"Design X."** (e.g. "Design
Spotify.", "Design a chat bot.") the way a senior engineer would at a whiteboard:

- A **diagram** — the boxes, labels, and arrows the engineer would draw.
- A **script** — what the engineer would say out loud to explain that diagram.

A deck walks through the design **incrementally**: each slide adds exactly one more
layer, entity, or concept to the diagram and explains it. Two requirement slides
come first; then the diagram starts from the simplest possible system and grows until
the last slide shows the complete system.

## Output

- Decks are **standalone HTML files** saved in the `slides/` folder.
- The filename is the **topic name, kebab-cased**, e.g.:
  - topic `"chat bot"` → `slides/chat-bot.html`
  - topic `"Spotify"` → `slides/spotify.html`
- Each HTML file is self-contained (inline CSS/JS) so it can be opened directly in a
  browser with no build step or external dependencies.

## Slide deck structure

Every deck shares the same look, feel, and features.

### Template

The canonical example/template deck is `slides/example.html`. **Start every new deck
by copying it** to `slides/<topic>.html`; don't build a deck from scratch. It contains
the shared CSS, the requirement-slide helpers, the scene builder, and the navigation
engine, plus comments explaining each. Then replace:

1. `<title>` and the `TOPIC` constant.
2. The requirement cards on slides 1–2.
3. `SCENE`: every box and edge of the **final** system.
4. The `SLIDES` array: one entry per step.

Leave the scene builder and the engine (marked "You should not need to edit") as
they are, so every deck behaves identically. If a deck needs a new reusable feature,
add it to the template first and then use it in the deck.

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

### Progression

- **Slide 1: functional requirements.** A grid of numbered cards (`cardGrid`), one per
  capability, plus a dashed `strip` listing what is out of scope.
- **Slide 2: non-functional requirements.** A card grid (scale, latency, availability,
  durability, consistency, cost, ...), an `estimatesPanel` with back-of-the-envelope
  numbers, and a `strip` with the takeaway (the numbers that shape the design).
- **Slide 3:** the simplest starting point for the diagram, e.g. one client and one
  server.
- **Each subsequent slide:** adds one more layer/entity/concept to the diagram and
  explains it in the script.
- **Final slide:** the full diagram of the complete system.

### Workflow for a new deck

1. **Agree on requirements first.** Before building, propose broad functional and
   non-functional requirements, with rough scale numbers and what is out of scope, and
   check them with the user. The agreed list becomes slides 1–2.
2. Sketch the **final** architecture and the order in which pieces get added. A large
   subsystem can get its own sub-arc (see "Multiple scenes" below).
3. Copy the template, lay out `SCENE`, and write `SLIDES`.
4. Render the slides and check them visually: no overlapping boxes, no edges running
   through boxes, labels readable. For example, take headless Chrome screenshots at
   1440×900.

## Building diagrams with the scene builder

Architecture diagrams are **not** hand-written per slide. Instead:

1. **Declare the final system once** in `SCENE`. Give every box and edge the position
   it has in the complete diagram:
   - Box: `{ id, x, y, w, h, label, kind, sub }`
   - Edge: `{ id, from, to, pts: [[x, y], ...], label?, lp?, both?, async? }`
   - Optional `bus`: a hub box (API gateway, load balancer) that fans out to `members`
     along a vertical line. Members join the bus automatically as they appear.
2. **Each slide says only what it adds:** `scene({ add: [...ids], remove: [...ids] })`.
   Visibility is cumulative, so the builder is stateful; call it in slide order. Use
   `remove` sparingly, for example when a monolithic "server" is split into services
   (its edges disappear automatically once an endpoint is gone).

What the builder does for you:

- **Highlights what's new.** Boxes added on the current slide get a thick, glowing
  accent outline. New edges and their labels turn the accent color. This is how the
  audience spots "the one new thing" on each slide, so every slide should add at least
  one element.
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

For a deep dive into one subsystem (e.g. the recommendation pipeline in
`slides/spotify.html`), declare a second scene with its own builder and switch to it
for a run of slides. Show the subsystem as a single box in the main scene first, zoom
into it, then return to the main scene, whose state picks up where it left off.

## Writing the script

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

When creating a new deck, match the existing decks in `slides/` for visual style,
layout, navigation behavior, and script conventions so every deck feels like part of
the same series.
