# Guided Bench Test — Status

**Date:** September 7, 2026
**Why this exists:** BENCH-TEST-CHECKLIST.md is accurate but 750 lines, and
you opened it, got lost, and didn't run the test. That was the document's
failure. This session built the same test into the app as a one-step-at-a-time
walkthrough. Written for you, plain English.

## What you get

Open LightCanvas → Projects page → the yellow card that says **"Test your
light boxes."** (Or go straight to `/bench-test`.) Then:

- **One step per screen.** 20 steps. Never two things at once, never step 7
  visible while you're on step 3. Big text, big buttons, made to be read
  from a step back while your hands are on a controller.
- **Every screen tells you three things:** what to physically do, what
  should happen, and buttons for what actually happened.
- **Every screen has a way out.** There's always a "My screen doesn't look
  like this / I'm not sure" button — pick it, type a few words about what
  you actually see, and move on. Nothing pretends to pass, and nothing dead
  ends.
- **The five safety rules come first**, on their own screen, and you have to
  acknowledge them before anything else appears.
- **It remembers where you are.** Every tap saves itself in the browser on
  your PC. Close the browser mid-test, restart the computer, come back three
  days later — you land on the exact step you left. The Projects-page card
  even shows "Continue — step N of 20."
- **You can go back a step** any time, and your earlier answer is still
  there to change.

The order matches the checklist: safety rules → gather everything → unplug
the Director → then for Box 4: label check, connect (stake on Port 1),
power-up and describe the lights, find it in the software, **match the
numbers**, light the stake on Port 1, **move the stake to Port 9 and light
it again** (that's the both-halves-of-the-board power question, as its own
full step) → swap to Box 1 and do it all again → the port-by-port write-in
tables for both boxes → your results.

**The numbers screen** shows you both possible sets side by side — the one
with letters (09…18 / 30…3F) and the numbers-only one (9…24 / 48…63) — and
you just pick which one your screen matches, or say neither. The tell is
printed right there: any letters means the first set. You never need to know
why; both sets are the same board.

**At the end:** everything you answered in one block of text with a **"Copy
my results"** button — paste the whole thing into your chat with Claude and
that's your report. Anything that went wrong is pulled to the top under
"Needs attention first." If your browser blocks the copy button, the page
selects the text for you and tells you to press Ctrl and C.

## Where your answers live

In the browser on your PC (not in the project database, and not on the
internet). They survive refreshes and restarts. The copy button is how they
leave the machine. "Start over" on the results screen erases them — it asks
twice before it does.

## What this is NOT

- It is **not new procedure.** Every step, fact, number and safety rule
  comes from BENCH-TEST-CHECKLIST.md, which stays as the full reference
  (it now carries a note pointing at the walkthrough).
- It does **not talk to your controllers.** You still drive the LOR Hardware
  Utility; the app walks you through it. Whether the app *could* talk to
  them directly is answered honestly in
  BENCH-TEST-DIRECT-CONTROL-FEASIBILITY.md — short version: partly possible,
  not worth it before the season.

## Verified by running it

- Clicked through every screen in a browser: safety, all seven Box 4 steps,
  the swap, all seven Box 1 steps, both port tables, the summary.
- Both number screens show the correct ranges for the correct box (checked
  against the hardware doc's addressing by `scripts/verify-bench-test.mts`,
  which also checks step order, the escape hatches, the stop-path guidance,
  the port predictions, and the report contents — 30 checks, all passing).
- Stop paths seen on screen: "board is completely dark" shows the red
  stop-and-pull-the-cord instructions; "label says something different"
  parks that box.
- Persistence seen working: left mid-test, came back via the Projects card
  ("Continue — step 3 of 20"), landed on the right step; finished all 20,
  reloaded the page, all 20 answers still there.
- "Start over" seen wiping to a clean step 1 after its double-confirm.
- The copy fallback seen working (in the test browser, which blocks
  automatic copying: the page selected the report and showed the
  press-Ctrl-C message).

## Small honest notes

- In your normal Chrome the Copy button should just say "✓ Copied". The
  select-it-yourself message only appears if the browser refuses.
- The port tables are the one screen type that scrolls (16 write-in rows for
  Box 4). That's one step's worth of content, so it's within the
  one-step-per-screen rule, but it is a longer screen than the others.
- The walkthrough is in the app, so the dev server has to be running — the
  same Start LightCanvas icon as always.
