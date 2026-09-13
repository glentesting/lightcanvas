# Guided Bench Test — Status

**Date:** September 7, 2026 · **Updated:** September 12, 2026
**Why this exists:** BENCH-TEST-CHECKLIST.md is accurate but 750 lines, and
you opened it, got lost, and didn't run the test. That was the document's
failure. This session built the same test into the app as a one-step-at-a-time
walkthrough. Written for you, plain English.

> **The test has since been run — 12 September 2026, both Pixie boards
> passed.** Its copy has been corrected against what actually happened that
> night: the Hardware Utility's real menu path, the fact that testing a port
> is the **Configure → Test Pixels** tab rather than the greyed-out "Test
> Lights" sidebar item, and the FTDI driver step Windows does not do for you.
>
> **Reframed around Box 3 on 12 September 2026.** The walkthrough is not
> "done" — Box 4 and Box 1 are done, and Box 3 is the box Glen has not
> powered up himself. It is now 23 steps: the same safety rules and the same
> connection procedure (both apply to any controller), then three new Box 3
> screens.
>
> **Framing corrected 12 September 2026.** The copy used to imply this gear
> had never run. It had — a full season, operated by someone else. The
> walkthrough now opens by saying so, because the difference matters to how
> nervous he is standing at the bench: the equipment is proven and he is the
> new variable. What is untested is said to be untested *by him*, except
> Box 3's unit ID and the ELOR setting, which nobody has ever checked.
>
> **The Box 3 screens deliberately do not test anything.** Box 3 looks wired
> straight into conduit rather than plugged in, so the honest next move is
> finding out how it is fed — not powering it up. The screens ask him to
> look at how the cable leaves the box, and to find and confirm the breaker
> that kills it. Both are eyes-only. If it turns out to be hardwired, the
> guidance says an electrician fits a cord and plug before anything else
> happens. Nothing on these screens puts him near live mains.
>
> **His September answers are preserved.** Answers live in localStorage
> keyed by step id, so adding steps cannot lose them — but the saved
> *position* would have pointed at the wrong screen, and could have skipped
> past the new Box 3 work. `store.ts` is therefore persist **version 2**
> with a `migrate` that keeps every answer, port note and start time, and
> recomputes the position to the first step with no answer — which lands him
> on "Box 3: the one still to do". Verified by seeding a v1 twenty-answer
> run and reloading: 20/20 answers kept, port notes kept, position 18.
>
> Also corrected: the Box 1 port table used to say ports 2, 4, 6 and 8 were
> "unknown". Each face spans two consecutive ports — read off the board on
> 12 September — so the table now says so, and the verification suite
> asserts no port is described as unknown.

## What you get

Open LightCanvas → Projects page → the yellow card that says **"Test your
light boxes."** (Or go straight to `/bench-test`.) Then:

- **One step per screen.** 23 steps (20 through Box 4 and Box 1, then 3 for Box 3). Never two things at once, never step 7
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
