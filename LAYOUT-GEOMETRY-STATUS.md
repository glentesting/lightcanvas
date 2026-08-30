# Layout Geometry — Status

**Date:** 2026-08-28
**Goal:** props that look like the owner's real coroplast cutouts, arranged on
his photo of his yard — with tools a non-technical person can actually use.

## Exact prop geometry (built to spec, not inferred)

`src/lib/fixtures/coro-shapes.ts` is the single source for shape AND wiring
order; it feeds both the preview light points (`expandFixturePixels`) and the
layout editor's outlines (`PropShape`). Fixtures carry a
`geometry.coroShape` hint ("tiered-tree" | "star5" | "arch" | "stake") set at
import and inferred from `lor.propName` for older fixtures.

- **Mini tree (80 px):** flat tiered silhouette; 10 horizontal rows of
  [3,4,5,6,7,9,10,11,12,13] pixels top→bottom; wired bottom row first,
  serpentine. **Verified with the real render engine: a chase climbs the
  tree in bands** (bright band y: 410 → 379 over one sweep).
- **Star (20 px):** 5-point star outline above each tree, pixels around the
  outline (radius spread 3.6–8.0, not a blob).
- **Arch (25 px):** true semicircle, pixels leg → top → leg. **Verified: a
  chase travels over the arch** (head x: 34 → 48).
- **Stake (5 px):** 5 pixels stacked vertically on the stick; the ground
  spike below carries none. Silhouette shows the spike.
- **Faces:** unchanged (traced outline), per instructions.
- **AC channels:** unchanged polyline rendering — but see naming/tracing.

Verify with `npx tsx scripts/loredit/verify-coro-geometry.mts` (16 checks).

## Line tracing for the AC strings

His AC strings run along the ROOFLINE, RIDGES and PEAKS — the template's
"AC Top Window / Columns / Railing" names described the demo house, not his.

- The 16 unit-01 AC fixtures are renamed **"Roof Light String 01–16"** (in
  his live project and for future imports). `lor.propName` keeps the
  template name, so **export mapping is untouched** — verified after a
  rename round-trip.
- Inspector → Details has **"Trace where it runs on the photo"** for any
  fixture without a fixed coro shape: click along the roof, each click adds
  a point, Done saves the path. The lights then follow that exact line
  (multi-point polyline → the render engine's existing path distribution).
- The name field at the top of the inspector renames the string
  ("Roofline Left" etc.); renames persist and never touch export mapping.

Verified live in the browser on his real project + his real photo: traced a
4-point roofline, the fixture's path became exactly those points, and it
survived a full reload.

## Bulk placement — "Place a Row"

Button in the top-left of the layout canvas: pick a set (Yard Stakes ×40,
Arches ×8, Mini Trees ×8, Tree Stars ×8), click where the row starts and
ends (more clicks = a curved row), Done. The whole set distributes evenly
along the drawn line **in numeric order**, so chases travel across the yard
in wiring order. Shapes translate whole — nothing deforms.

Verified live: all 40 stakes placed in one action, left→right in order
(Stake 01 at x=50 → Stake 40 at x=670), even 15–16 px gaps, positions
persisted across reload.

## The "1562 channel overlaps" warning — investigated

**False positive, now fixed.** The old check compared raw start channels
across ALL fixtures on "universe 1" — but LOR addressing is per controller
unit: Mini Tree 01 (unit 09, circuits 1–240) and Mini Tree 02 (unit 0A,
circuits 1–240) don't conflict just because both start at circuit 1.

The check now groups LOR-imported fixtures by network + unit and compares
circuit ranges within a unit (hand-made fixtures keep the legacy
universe/channel check among themselves). Audit of his real 84-prop display:
**zero genuine conflicts** — the layout editor now shows "All props mapped —
layout ready." If a real conflict ever appears, the warning reads in plain
English ("two light strings are set to the same plugs...") and each prop's
Wiring tab explains what it means.

## More fake chrome removed (fresh-eyes finds)

- Inspector: dead "Brightness Limit" slider, fake "mapping" tab (hardcoded
  "Controller 1"/"Port 1"), jargon "channels" tab with a meaningless /512
  meter, and a "preview" tab of dead Off/On/Test buttons — all replaced by
  two honest tabs: **Details** (trace tool, real bulb counts) and **Wiring**
  (real unit/plug info from the import + plain-language conflict status).
- AppTopBar: hardcoded "Christmas 2026" fallback label, a dead
  "Search everything ⌘K" box, and a dead "Preview" button — removed; the
  project chip now links back to the project list.

## What still looks wrong (honest list)

- The **cartoon-tree silhouette** behind the pixel rows is a stylized
  three-tier shape, not a photo-match of the coro cutout; the pixel
  positions/rows are the accurate part.
- **Traced roofline pixels are display bulbs** — an AC string is one dimmer
  on the wire (Wiring tab says so), so a chase on a roof string animates in
  the preview but exports as a plain on/dim envelope, as always documented.
- No scale/rotate on shapes; tree/arch sizes come from the template import
  and may not match his photo's perspective until he drags/places them.
- The night-stage (photo) preview inherits all fixes automatically via
  `expandFixturePixels`, but was not visually screenshot-verified (the
  browser pane can't composite in this environment); the geometry layer it
  reads from is the code verified above.

## Where things live

- Geometry: `src/lib/fixtures/coro-shapes.ts` (+ `geometry.coroShape` on
  fixtures, set by `src/lib/imports/loredit-layout.ts`)
- Preview wiring: coro branch at the top of `expandFixturePixels`
  (`src/lib/scene/pixel-geometry.ts`)
- Layout editor: coro silhouettes, trace mode, Place a Row, lor-aware
  conflict check, honest inspector — all in `src/components/LayoutEditor.tsx`
- Verification: `scripts/loredit/verify-coro-geometry.mts`
