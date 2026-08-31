# Editor Upgrade — Status

**Date:** 2026-08-29
**Companion to:** GAP-ANALYSIS.md (which explains what was missing and why).
This is what got fixed, what it looks like now, and what remains — written
for a non-technical reader, with screenshots taken and judged during the
work this time.

## The big one: one picture everywhere

The app used to have four different ways of drawing your display, and they
disagreed — the layout editor drew its own cartoon shapes, the photo
preview drew real bulbs, the no-photo view squeezed 84 props into six
blobs, and the timeline drew nothing at all. The layout editor's "Night
Preview" even showed made-up colors that had nothing to do with your show.

Now there is **one renderer**. The same bulb positions and the same colors
feed the layout editor, the designer preview, the new timeline preview, and
the night view. When you fix a prop's shape once, it is fixed everywhere,
and what you see is what the show data actually says.

Confirmed by looking: the layout editor's Night Preview now shows your
darkened house with the actual glowing bulbs — mustard roof strings along
your real rooflines, green trees with their pixel rows, gold stars on the
tips — and the same picture appears at the top of the timeline.

## Everything else that landed (all visually confirmed in screenshots)

- **Short names.** "RGB Mini Tree Base 01" is now **"Tree 01"**; stars are
  "Star 01", arches "Arch 01", stakes "Stake 12", and the faces are just
  **Elden, Felix, Ralphie, Zuzu**. Any name you already changed yourself was
  left exactly as you set it. (Export still works — the technical
  Light-O-Rama name is kept invisibly under the hood.)
- **Identity colors.** Idle props are finally tellable at a glance: trees
  light green, stars gold, arches dark, stakes dark grey, roof strings
  mustard, faces Christmas green. When the show plays, real sequence colors
  take over. Seen live: the timeline preview switched from idle colors to
  twinkling show colors the moment play started.
- **Arch shadow — gone.** The arc was being color-filled underneath; it no
  longer is.
- **Tree + star are one prop on screen.** Every star now sits exactly
  centered on its tree's tip (checked to the pixel on all 8) and moves with
  the tree when you drag it. On the wire they stay two separate circuits,
  so export is untouched.
- **Marquee select + bulk delete.** Drag a box on the layout photo, get
  "N light pieces selected", hit Delete (button or keyboard). Verified:
  selected 2 trees on the real project; selected-all-6 and deleted them on
  a throwaway project. Escape clears; clicking empty space clears.
- **Timeline is finally an editor.** It now has: the live show preview at
  the top, a red playhead that moves during playback, **the view scrolls
  itself to follow the playhead** (watched it follow from 0:08 to 0:38),
  and **click the time ruler to jump anywhere** in the song (watched a
  click pull the music from 0:40 back to 0:20). The audio player now
  publishes its clock to the whole app instead of keeping it private —
  that one disconnect was the root cause of every "timeline doesn't move"
  symptom.

## Small honest notes

- Your project shows **83 props** — you deleted "Roof Light String 15"
  (originally AC circuit 01.15) at some point, which is fine. If you want
  it back: Import from Light-O-Rama → pick it → "Add alongside".
- Arches idle in dark slate are subtle against a dark night photo — by
  design ("arches dark"), they light up when the show plays.
- The trees near the bottom edge of the photo sit close to the canvas
  border; drag them up a touch if the labels feel cramped.

## What remains (from GAP-ANALYSIS.md, in order)

1. **Scrub/seek on the designer page** (main screen can play/pause only).
2. **"As exported" honesty** — the app previews 10 effect types but pixel
   props export as color washes; either grow the export grammar (needs the
   S6 test) or add an export-fidelity preview toggle.
3. **Undo button in the layout editor** (undo exists, it's just invisible).
4. **Group tracks UI** in the timeline; copy/paste-at-beat for blocks.
5. **The S6 open test** — still the season's gate, still manual, three
   files waiting in `scripts/loredit-spike/test-fixtures/output/`.
6. Nice-to-haves: scale/rotate, per-strand rows, richer effects, lip-sync,
   waveform zoom-sync.

## Where things live (for the next session)

- The one renderer: `src/components/stage/ShowCanvas.tsx` (2D canvas) on
  top of `expandFixturePixels` (`src/lib/scene/pixel-geometry.ts`); the
  photo night-stage (three.js) reads the same pixels.
- Identity colors + short names: `src/lib/fixtures/identity.ts`.
- Tree/star pairing: `pairIndexOf` / `starFrameFor` in
  `src/lib/fixtures/coro-shapes.ts` — star positions are DERIVED from the
  paired tree, never stored.
- Transport: WaveSurfer publishes to `useTransportStore`;
  `registerSeekHandler`/`requestSeek` in
  `src/lib/store/transport-store.ts` let any surface seek the real audio.
- Playhead/follow/seek: `TimelinePlayhead` in `src/components/Timeline.tsx`.
- Marquee + bulk delete + night ShowCanvas: `src/components/LayoutEditor.tsx`.
