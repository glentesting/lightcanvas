# Sequencing Upgrade — Status

**Date:** 2026-08-30
**Companion to:** GAP-ANALYSIS.md (the "NEEDED SOON" list) and
EDITOR-UPGRADE-STATUS.md (the session before this one).

This session worked down the five things you asked for, in order. Everything
below was run in a browser and looked at on screen before being called done —
not just compiled. Written for you, in plain English.

---

## 1. You can now jump around the song on the main screen

Before, the main screen could only play and pause. Now the coloured bar along
the bottom is a real song bar:

- **Click anywhere on it** and the music — and the lights on your house
  photo — jump to that moment.
- **Drag along it** to scrub through the show. A little time readout follows
  your cursor so you can see where you're about to land.
- A red marker shows where you are, and the part you've already played is
  shaded darker.
- **Spacebar** plays and pauses. **Left/right arrows** nudge 5 seconds
  (hold Shift for 10). **Home** jumps back to the start.

It works while paused too, which is the useful part — you can park the
playhead on one moment and just look at the house.

*Seen working:* clicked at the two-thirds mark, the clock went to 1:50 and the
house lit up; dragged back and it landed on 0:26 with a different set of
lights on.

> One honest note: the bar says "Full Song" instead of showing verse/chorus
> blocks. That's because the beat analysis stored for your song didn't record
> song sections. It's real data, not a broken feature — if you re-run the
> analysis some day and it finds sections, they'll appear automatically.

---

## 2. What you see is much closer to what your house will actually do

This was the big one. The app can draw ten kinds of lighting move, but
Light-O-Rama only understands its own vocabulary — so some moves used to
quietly turn into a flat colour wash on the way out. You'd see a chase in the
app and get a wash on the house.

**Two things changed.**

### The export got smarter

I studied your purchased Light-O-Rama sequence — all 50,695 effects in it —
and worked out the exact way LOR writes two more kinds of move: **curtains**
(light sweeping open or closed from an edge) and **bars** (bars of light
marching across a prop). Those two plus colour wash are 94% of everything in
the purchased show, so they're the right two to add.

Now:

| What you place | What your house does |
|---|---|
| **Chase** | A bar of light travelling the way you set — or sweeping out from the middle if you chose that |
| **Wave** | Bars of light marching along the piece |
| **Meteor** | A bar of light travelling the way you set |
| **Fireworks** | Bursts opening outward from the middle |
| **Strobe** | A colour wash set to blink |
| **Colour Wash / Fade / Pulse** | Exactly what you see |

In your show as it stands, that's **1,218 chase moves across 55 light
pieces** that used to flatten into a wash and now actually chase.

I was careful about how this was done. Every settings string the app writes is
assembled only from pieces Light-O-Rama itself writes — the mix modes, the
speeds, the parameter strings, the colour-slot layout. A new test
(`verify-effect-grammar.mts`) reads your purchased sequence, learns LOR's own
vocabulary from it, then checks every string the app can produce against that
vocabulary. It caught three real mistakes while I was writing this, including
one that had been in the exporter all along:

- two-colour washes were being written in a shape LOR never uses (it always
  writes six colour slots, not two)
- expanding and compressing bars need a different width value than the others
- the paste code was clamping

All three are fixed and the test now passes on all 68 combinations.

### The app tells you the truth *before* you export

Open **Export → Next** and there's a panel at the top: **"What will actually
reach your lights."** It reads your real show and says, for every kind of move
you've used on every kind of wiring, what the house will really do and what
won't survive. For example:

> **Twinkle** on smart pixel pieces — *Comes out plainer than the preview*
> On the house: A plain colour wash.
> Won't carry over: The random flickering. Light-O-Rama has no twinkling move
> for smart pixel pieces.
> *84 moves across 40 light pieces*

The plainest results are listed first, so the things worth knowing are at the
top. Nothing is hidden and nothing is guessed — it describes exactly what the
exporter does.

The same sentence also appears at the bottom of the Timeline whenever you
select a move, so you learn it while you're building rather than at the end.

### A bug this uncovered

The Export screen used to open onto **hundreds of red warnings** saying your
arches and roof strings "share channels." They were all false. The rule that
Light-O-Rama pieces only clash within the same controller box had been applied
to the Layout screen but never to the Export screen. Fixed — your show now
reports **zero** wiring problems, which is correct.

---

## 3. Undo is now visible in the Layout editor — and it actually works

There are **Undo** and **Redo** buttons in the Layout toolbar. They grey
themselves out when there's nothing to undo, so they never lie to you.
**Ctrl+Z** and **Ctrl+Shift+Z** work too.

And after any big change — a bulk delete, or placing a whole row — a message
appears at the bottom of the photo saying what just happened, with an
**"Undo that"** button right there and a **"Keep it"** button. It fades away
on its own after a few seconds.

**Two real problems were fixed to make this trustworthy:**

1. **Bulk actions used to need one undo per prop.** Deleting 40 stakes made 40
   separate undo steps, so Ctrl+Z would bring back one stake. Now a bulk
   delete or a "Place a Row" is a single step — one undo puts all of them
   back.

2. **Undo was pointed at the wrong thing entirely.** Every time the app
   auto-saved, the little "Saving… / Saved" status counted as an undoable
   change. So your first Ctrl+Z after any edit would undo a *save
   notification* and appear to do nothing. This affected the Timeline too.
   Fixed — only real changes to your show count as undo steps now.

I also made sure undo can never roll back past the moment you opened a
project, so it can't wipe your display.

*Seen working:* selected two arches on your real photo, deleted them (83 → 81
pieces), clicked "Undo that" — both came straight back and the count returned
to 83.

> While testing this I did delete Arch 01 and Arch 02 from your real project
> before the undo fix was in, and the broken undo didn't bring them back. I
> restored them from a snapshot I'd taken minutes earlier — all 83 pieces and
> all 3,455 moves are exactly as they were. Everything after that was tested
> on a throwaway copy, which has since been deleted.

---

## 4. You can put one move on a whole set of lights

Above the timeline rows there's a bar called **Sets of lights** with a
**Make a set** button. It offers ready-made sets built from your actual yard:

- All Mini Trees (8)
- All Tree Stars (8)
- All Arches (8)
- All Yard Stakes (40)
- All Roof Lights (15)
- All Singing Faces (4)

That's every one of your 83 pieces. There's also **"Pick pieces myself…"** for
anything else — name it, tick the pieces, done.

A set gets its own row at the top of the timeline, in its own colour, labelled
with how many pieces it drives. **Drop one lighting move on that row and all of
them do it.** A piece's own row still wins over the set's, so you can move a
whole group and then override one piece.

Sets are saved with your project and are still there after a reload. Export
already knew how to fan a set's moves out to each piece, so this needed no
export changes.

*Seen working:* made "All Arches", dropped one Chase on its row, and all eight
arches lit blue together in the preview. Reloaded the page — set and move
still there.

---

## 5. Copy, paste-at-beat, and repeat-every-bar

Select some moves and a toolbar appears with **Copy**, **Paste at playhead**,
**Repeat…**, **Duplicate** and **Delete**.

- **Copy** (or Ctrl+C) picks up whatever you've selected, across as many rows
  as you like.
- **Paste at playhead** (or Ctrl+V) drops it wherever the red line is — and
  **every pasted move lands exactly on a beat**. It goes back on the same rows
  it came from; if a row has since been deleted, it says so rather than
  silently dropping part of the paste.
- **Repeat…** opens a small panel: *repeat this every [1 bar] for [7] more
  times*. It tells you how long a bar of your song actually is, and how many
  moves it's about to add, before you commit. One Ctrl+Z undoes the whole lot.

The fiddly part was keeping it in time. Your song's beats aren't evenly
spaced — they're wherever the drums actually land. So each copy is measured
from the original position (never from the previous copy, which would let
rounding pile up) and then pulled onto its own nearest beat. Tested with sixty
repeats on a deliberately imperfect bar length: not one of them drifted off
the beat.

*Seen working:* repeated one Chase seven times across the arches set, copied
all eight, moved the playhead to 0:16 and pasted. Checked the saved data
afterwards: **15 of the 16 moves sit exactly on a beat** — the one exception
being the very first block, which I placed by hand with a mouse drag.

---

## What's still outstanding

- **The Light-O-Rama S6 open test.** Still the season's real gate, still
  manual. Three files are waiting in
  `scripts/loredit-spike/test-fixtures/output/`. Everything else can be
  perfect and the season still fails if S6 won't open them. This is the next
  thing worth doing, and it needs you and a double-click, not more code.
- **Twinkle and Sparkle still flatten to a colour wash** on smart pixel
  pieces. That isn't a shortcut — Light-O-Rama genuinely has no twinkling
  motion effect for pixel props. The app now says so plainly before you
  export. (On your plug-in roof strings, twinkle *is* real and does carry
  over.)
- **Roof strings still export as brightness only.** A chase on a traced roof
  string animates bulb-by-bulb in the preview but is one circuit on the wire.
  The app says this too.
- **Meteor's fading tail** and **fireworks' random burst points** don't
  survive; they become a hard-edged bar and centre bursts. Also stated up
  front.
- The beat analysis after uploading a song still freezes the page for a minute
  or two.
- Still no scale/rotate on prop shapes, no per-strand rows, no lip-sync.

## For whoever works on this next

- Export grammar: `src/lib/exports/loredit/effects.ts`. Every settings string
  is verbatim-observed LOR grammar with only the colour slots substituted.
  **Do not invent parameter values** — `scripts/loredit/verify-effect-grammar.mts`
  will fail, which is the whole point of it.
- The honesty table: `src/lib/exports/loredit/fidelity.ts`. It is the single
  source for both the Export dialog and the Timeline's parameter panel. If you
  change what `effects.ts` emits, change the sentence here in the same edit.
- Undo: `src/lib/store/use-undo.ts` (buttons + shortcuts). The `equality`
  option in `editor-store.ts` is what stops non-edits becoming undo steps —
  don't remove it. Bulk edits must use `deleteFixtures` / `updateFixtures` /
  `addBlocks`, never a loop of single-item actions, or undo goes back to being
  one-step-per-item.
- Sets: `src/lib/fixtures/sets.ts` (the presets) and `GroupBar` in
  `Timeline.tsx`.
- Copy/paste/repeat: `src/lib/timeline/repeat.ts` (pure functions) with the
  clipboard in `clipboard-store.ts` — deliberately outside the editor store so
  it is never autosaved and never an undo step.
- New test suites, all `npx tsx`:
  `scripts/loredit/verify-effect-grammar.mts`, `scripts/verify-undo.mts`,
  `scripts/verify-timeline-edit.mts`.
