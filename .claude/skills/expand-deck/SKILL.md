---
name: expand-deck
description: Run the expand-slide skill over a whole system design deck, one slide at a time, until no architecture slide (other than the last) has a script longer than 5 sentences. Plans are auto-approved. Takes a deck slug. Use when the user says "expand the whole deck", "expand every long slide in <deck>", or "/expand-deck spotify".
argument-hint: <deck-slug>
---

# expand-deck

Expand every long slide of one deck by running the `expand-slide` skill
(`.claude/skills/expand-slide/SKILL.md`) in a loop. **The user approved every plan
up front by running this skill:** skip expand-slide's "propose and wait for
approval" stop, and go straight from the plan to Phase 2.

Argument: `<deck-slug>`, e.g. `spotify`. If `public/decks/<slug>.json` doesn't
exist, stop and say so.

## What counts as long

```
node scripts/long-slides.ts <slug>
```

prints every slide whose script is **more than 5 sentences**, in slide order, one per
line: `<url number>\t<sentences>\t<kind>\t<title>`. The script already skips the
generated intro, the functional and non-functional requirement slides, and the
**last slide** of the deck (the full-system wrap-up, which stays as is). Empty output
means the deck is done. Always use the script's count; don't recount by eye.

## The loop

Read `.claude/skills/expand-slide/SKILL.md` once at the start, and keep a **done list**
of titles of slides already produced or expanded during this run (empty at first).

1. Run `node scripts/long-slides.ts <slug>`. Take the **first** line whose title is
   not on the done list. If there is none, go to "Finish".
2. Expand that slide number with the expand-slide steps:
   - **Phase 1:** find the slide, split it into beats, and pick a diagram per beat.
     The target may be a detail slide; expand it anyway (don't ask). Write the plan
     table in your reply so the user can follow along, then **continue without
     waiting**.
   - **Phase 2:** edit the deck, run `npm run validate` and fix everything on the
     slides you touched, and visually check every new slide at 1440×900.
   - Every resulting beat should be **5 sentences or fewer**, so the slide doesn't
     come up again.
3. Add the titles of every slide in the new group to the done list. This stops the
   loop from picking the same material forever if a beat couldn't be split below
   the limit.
4. Report one line, e.g. `Expanded 30 → 30–34 (+4)`. Go back to step 1, which scans
   from slide 1 again.

**Safety stop:** stop after 40 expansions, or as soon as one expansion fails in a way
you can't fix (validation errors you can't resolve, a slide the plan can't split),
and report where you stopped. Don't skip ahead past a failure.

Rescanning from 1 every time is intentional: numbers shift after each expansion, and
the script is cheap, so the next target is always found fresh rather than computed.

## Finish

1. Run `node scripts/long-slides.ts <slug>` and `npm run validate` one last time.
2. Report: the number of slides expanded, the deck's slide count before → after, a
   list of the expansions (`old number → new range`, title), any slides that are
   still listed (and why), and anything you couldn't verify visually.
3. Don't commit unless the user asks.
