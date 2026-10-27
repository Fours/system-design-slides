# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Purpose

This project produces **system design walkthrough slide decks**. Each deck answers a
single systems-design interview question of the form **"Design X."** (e.g. "Design
Spotify.", "Design a chat bot.") the way a senior engineer would at a whiteboard:

- A **diagram** — the boxes, labels, and arrows the engineer would draw.
- A **script** — what the engineer would say out loud to explain that diagram.

A deck walks through the design **incrementally**: each slide adds exactly one more
layer, entity, or concept to the diagram and explains it. The first slide is the
simplest possible starting point; the last slide is the complete system.

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

The cannonical example/template slide show is at `slides/example.html`. It is the template used when building new slide decks. It contains helpful comments.

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

- **Slide 1:** the simplest starting point — e.g. one user, one client, one server.
- **Each subsequent slide:** adds one more layer/entity/concept to the diagram and
  explains it in the script.
- **Final slide:** the full diagram of the complete system.

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
