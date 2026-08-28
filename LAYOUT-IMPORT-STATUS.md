# Layout Import — Status

**Date:** 2026-08-28
**Goal:** the owner's real display exists inside LightCanvas, imported from a
`.loredit` template, with export mapping automatic and the preview showing
real prop shapes instead of default boxes.

## What it looks like now (plain description)

Open the Layout editor and click **Import from Light-O-Rama**. Pick any of
your purchased `.loredit` files. A window lists everything the file contains —
265 props — folded into groups so it isn't a wall of names: Mini Trees,
Arches, Pixel Stakes, Singing Faces, AC Circuits first (your stuff, already
checked — the button reads **"Import 84 props"** the moment the file loads),
and the gear you don't own (RGB rooflines, floods, the extra mega trees)
collapsed below, unchecked. If props already exist, you choose: replace them
(their timeline effects go too — it says so) or add alongside. Nothing is
overwritten silently.

After import, the canvas stops being cartoon boxes. The four singing trees
are actual tree outlines (55 traced points each). Every AC window is a real
rectangle where the template's house has a window; columns and railings are
outlines. The 40 pixel stakes are little vertical sticks in rows across the
yard. Mini trees sit in a line along the ground, arches in front of them,
windows up on the house. It looks like a light display, arranged the way the
LOR preview arranges it — and every prop drags as one piece, shape intact,
so you can pull it onto your own photo.

The left panel lists all 84 props by category with their true pixel counts.
Generate a sequence and every one of them is a track. Export, pick the same
template, and the mapping table says **"84 of 84 fixtures matched
automatically — review below"** — you check a box and click Export. No
typing, no matching by hand.

## What was verified by running code (`npx tsx scripts/loredit/verify-layout-import.mts`)

Against the real Carol of the Bells template — 29/29 checks pass:

- All 265 PropClass props parse and group; **84 preselected**, matching the
  hardware reference exactly: 8 tree bases (80 px) + 8 stars (20 px) = 100
  px/tree, 8 arches (25 px), 40 stakes (5 px), 4 FaceV2 tree outlines
  (DumbRGB, unit 30), 16 AC circuits (unit 01, Regular, 1 channel each).
- **The preselected RGB props sum to exactly 1,200 pixels** — the hardware
  doc's total for the owner's display. The import's math and the doc agree.
- Addressing carried onto fixtures: tree base 01 = Aux A unit 09,
  faces = unit 30, AC = unit 01 — all from ChannelGrid, none hand-entered.
- Shapes reach the preview: `expandFixturePixels` distributes the face
  outline's 23 display bulbs along its traced 55-point shape (verified inside
  the shape's bounding box, spread out — not a default box), stakes render as
  vertical sticks, AC windows as closed outlines.
- Generation on the imported fixtures → export with the mapping the import
  created (zero calls to the default-guessing seeder, zero manual entries):
  **zero grammar violations**, no fixture skipped for missing mapping.

## What was verified in the app, in a browser

Dev server + the real template injected into the real file picker:

- The picker showed the groups with true pixel counts and "Import 84 props".
- After import: 84 prop groups on the canvas, 64 with traced polylines, the
  rest drawn as kind shapes (arches as arches, stars as circles — a
  PropShape gap where `custom`-kind props rendered nothing was found this
  way and fixed), zero invisible props.
- The import **survived autosave and a full page reload** — 84 fixtures came
  back from the database.
- **Real Opus 5 generation through the AI panel** on the imported display:
  "Added 3012 effects across 84 props (8 sections, 100% on detected beats)"
  — this also closes the previously-unverified "generation through the
  actual UI" item.
- Export dialog with the template: **"84 of 84 fixtures matched
  automatically"**, 84 mapping rows, 0 needing manual entry → Export →
  "Export complete — 84 props filled • 473 beat marks".

## Design decisions worth knowing

- **Coordinates:** LOR preview space is [-1,1]² with y up; imported points
  are mapped into the app's 720×420 stage (y flipped). The template's
  arrangement carries over (windows high, trees on the ground).
- **Parametric shapes** (Arch, Star, Firestick — no point lists in the file)
  import as a positioned anchor: arches render through the app's own arch
  curve, stars as small circles, stakes get a synthesized 2-point stick.
  Reverse-engineering LOR's parametric unit geometry wasn't worth the risk.
- **AC and face props** are one dimmer / one color channel on the wire
  (`lor.channelCount` keeps that truth, and export uses it), but import
  gives them enough *display* bulbs to draw their outline in the preview.
  Consequence: a chase placed on an AC prop animates in the preview but
  exports as a plain intensity envelope — same degradation the exporter has
  always documented.
- **Dragging preserves shape:** the layout editor's drag used to collapse a
  fixture to a single point; it now translates the whole point list. Scale
  and rotate are not built (position-only, per the task's "acceptable for
  now").
- **Faces:** one fixture per character (the FaceV2 whole-tree outline). The
  ~51 mouth/eye sub-props stay in a collapsed, unchecked picker group —
  importable, but lip-sync is explicitly a later job.

## What's stubbed / not done

- No scale/rotate on imported shapes — reposition by drag only.
- The picker's "not owned" groups are honest pass-throughs: importing them
  works, but their kinds are best-guess (floods → custom, etc.).
- Repositioned props are per-project; re-importing replaces positions with
  the template's again (replace mode) — there's no merge of placement.
- `verify-layout-import.mts` uses a synthetic 60 s analysis for the
  generate/export leg (the browser test used the real song).

## Still unverified

- **S6 opening the exports** — three files now await the same manual test:
  `lightcanvas-export-test.loredit`, `ai-pipeline-export.loredit`, and this
  feature's `layout-import-export.loredit`
  (all under `scripts\loredit-spike\test-fixtures\output\`).
- Dragging imported props onto a real house photo has only been exercised via
  the drag code path, not a hands-on placement session.

## Where things live

- Parser + fixture builder: `src/lib/imports/loredit-layout.ts`
- Picker dialog: `src/components/LoreditImportDialog.tsx` (opened from the
  Layout editor's "Import from Light-O-Rama" button)
- Store: `importFixtures(fixtures, "replace" | "add")` — also populates
  `sequence.loreditPropMap` so export mapping is automatic
- Fixture extension: `Fixture.lor` (prop id/name, StringType, network, unit,
  circuit, channelCount) in `src/lib/fixtures/types.ts`
- Shape rendering: traced-polyline branch in `LayoutEditor.tsx`'s PropShape;
  `expandFixturePixels` already handled multi-point layouts
- Verification: `scripts/loredit/verify-layout-import.mts`
