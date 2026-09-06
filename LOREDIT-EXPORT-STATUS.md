# .loredit Export — Status

**Date:** 2026-08-27 (export grammar widened 2026-08-30 — see SEQUENCING-UPGRADE-STATUS.md)
**Goal:** a working `.loredit` export, reachable from the UI, that writes real sequence
data onto the owner's actual props. Success = LOR S6 v6.6.12 opens the file and shows
effects on the right props at the right times.

## ✅ THE ACCEPTANCE TEST PASSED — 2026-08-31

The owner exported his **real show** from the app and opened it in
**LOR S6 v6.6.12**: opened clean, no errors; total time 3:39.84 matching his
song; 4,385 effects across all 83 props, including 1,246 `bars` motion
effects; arches showing a staggered chase 01→08; real intensity pulses on the
AC channels; the 473-mark "LightCanvas Beats" grid present alongside the
template's 1,478; `musicFilename` carrying his song. Of the "still
unverified" list below, this closes items 1–3 (item 2 at least for channel
ramps and for motion-effect output rendering as intended overall). **Item 4
is superseded** — since 2026-08-31 the exporter always writes the six-slot
palette form, the shape LOR itself writes. **Still genuinely unverified in
S6: the `curtain` grammar** (his show contained zero curtains) **and item 5,
real-hardware playback** (bench test not yet run). The section below is kept
as the original test plan for reference — the synthetic files remain useful
for the curtain check.

## The file to open in S6 (original plan, superseded by the pass above)

```
C:\Users\glenh\Documents\LightCanvas\AppRepo\scripts\loredit-spike\test-fixtures\output\lightcanvas-export-test.loredit
```

S6 Sequencer → File → Open. Expected: the full 265-prop RGBPlus layout, the template's
timing grids plus a new **"LightCanvas Beats"** free grid (60 marks, 0.5 s apart), and
effects on exactly these props in the first 30 seconds:

| Prop | What you should see |
|---|---|
| RGB Mini Tree Base 01 | red/green colorwash 0–4 s, blue fade-up/down 4–8 s |
| RGB Mini Tree Base 02 | white **bars marching right** 2–8 s (was a colorwash before 2026-08-30) |
| RGB Mini Tree Base 03, 04 | amber **bars** 10–15 s (came from one group block) |
| RGB Arch 01 | red/green colorwash 0–8 s |
| 01.01 AC Top Window 01 | fade up/down 0–4 s, beat pulses 4–8 s, shimmer 8–10 s, twinkle 10–14 s |
| 01.02 AC Top Window 02 | steady 80% 0–30 s |
| FaceV2-Elden Tree Outline | solid red 0–5 s, green twinkle 6–10 s |

Report any dialog or error text verbatim. This manual open is the only unverified step
between here and exporting real shows.

## What works (verified by running code)

All of this is exercised by two scripts you can re-run any time:

```
npx tsx scripts/loredit/verify-roundtrip.mts
npx tsx scripts/loredit/verify-export.mts
```

- **Round-trip is still byte-identical after the refactor.** The spike's parser/serializer
  was promoted verbatim into `src/lib/exports/loredit/xml.ts` (now typed); parsing the
  11 MB Carol of the Bells reference and regenerating it from structure alone reproduces
  the original byte for byte.
- **Template fill.** `parseTemplate` + `stripAllEffects` keep PreviewClass and
  TimingGrids verbatim (verified structurally identical in the output) and remove all
  50,695 template effects. No template path is hardcoded; the user picks the file in the
  export dialog, and `*.loredit` is globally gitignored so paid content can never be
  committed. (Note: the spike doc claimed test-fixtures was already gitignored — it
  wasn't; that hole is now closed.)
- **Fixture mapping.** `sequence.loreditPropMap` (fixtureId → SeqProp name) is confirmed
  once in the dialog and persisted via autosave. Defaults are seeded from the hardware
  reference: mini trees → `RGB Mini Tree Base 01–08`, arches → `RGB Arch 01–08`,
  bushes/stakes → `RGB Pixel Stake NN`, mega tree → the RGB Tree props,
  roofline/window fixtures → the 16 CTB16 unit-01 AC circuits in RGBPlus circuit order
  (Top Window → Bottom Window → Columns → Railing). Exact fixture-name matches win over
  kind-based seeding; unmapped fixtures are skipped and reported, never fatal.
- **Effect translation, honoring the channel/track grammar rule** (checked by
  `checkLoreditGrammar` on every export test — zero violations):
  - **Traditional (AC)** → `<channel>` INTENSITY/SHIMMER/TWINKLE only. fade → ramp
    up/down, pulse → per-beat decay ramps, strobe → SHIMMER, twinkle/sparkle → TWINKLE,
    everything else → constant INTENSITY. Effects are sorted and overlap-truncated
    (LOR rows are non-overlapping).
  - **DumbRGB (faces)** → `<channel>` rows with the color packed as signed 32-bit ARGB
    in `intensity` (full red = -65536, confirmed in output).
  - **RGB (pixel)** → `<track>` rows, motion effects written to the first track row
    (whole prop), using three grammars — **colorwash, curtain and bars** (2026-08-30).
    Together these are 94% of the reference file's motion effects (11,578 + 3,332 +
    344 of 15,971). Chase/meteor → bars, or curtain center,open|close for
    center-out/in; wave → bars; fireworks → one curtain center,open per burst;
    strobe → colorwash with the observed `blink_in_unison` intensity mode;
    wash/fade/pulse/twinkle/sparkle → colorwash. Fade keeps its intensity ramps and
    pulse now gets per-beat decay ramps, matching the AC path.
    Every string is a verbatim-observed LOR form with ONLY the six ARGB colour slots
    substituted — including LOR's own per-direction bar widths (expand/compress use
    22, the rest 12) and its six-slot palette shape.
    **Do not hand-edit these strings.** `scripts/loredit/verify-effect-grammar.mts`
    learns LOR's vocabulary from the reference file and fails on anything the app
    emits that LOR would not write. It caught three real defects when introduced,
    including a long-standing two-colour colorwash that used a slot count LOR
    never writes.
- **Timing grid.** Detected beats are written as a new `TimingGridFree` named
  "LightCanvas Beats" alongside the template's untouched grids.
- **Metadata.** Fresh sequence GUID, `author="LightCanvas"`, `createdAt` in LOR's
  date format, `totalCentiseconds` from the audio duration, `musicFilename` from the
  project's audio file name (S6 resolves it against `Documents\Light-O-Rama\Audio`).
- **UI door.** The editor header (`/project/[id]`) now has an **Export** button →
  ExportDialog → "Light-O-Rama S6 (.loredit)" (default format) → template file picker →
  mapping table with per-fixture dropdowns → download. `.lms` and `.xsq` options are
  gone; the dead `lor.ts`/`xlights.ts` exporters, `/api/export`, `/api/presets`, and the
  phantom `meyda` dependency are deleted.

## What's stubbed / simplified (by design, for now)

- **Twinkle and sparkle still flatten to colorwash on pixel props** — LOR has no
  twinkling motion effect for RGB props at all, so this is a limit of the format, not
  a shortcut. Meteor loses its fading tail (becomes a hard-edged bar) and fireworks
  lose their random burst positions and white flash. Ripple, blendedbars, plasma,
  mystify, spirals, spinner and garland exist in the reference and are NOT yet used —
  they are the next increment.
  All of the above is disclosed in the app before export by
  `src/lib/exports/loredit/fidelity.ts`, which the Export dialog and the timeline's
  parameter panel both read. Keep that table in step with `effects.ts`.
- **DumbRGB blocks are constant-color only** — no ramps, because ramp semantics for
  packed ARGB values are unverified.
- **Multi-circuit Traditional props** (2/4/8-channel props exist in the template) get
  the same envelope on every circuit rather than per-circuit variation.
- **RGB effects land on the first track row only** (whole prop) — no per-strand rows,
  no sub-region rectangles.
- **Whole-song export only** for .loredit (custom time range still exists for JSON and
  video exports).
- Chase grammar (`loopLevels`, numeric settings prefixes), `MotionPaks`,
  `RgbAggregates`, `Subsequences`, `BeatChannels` — untouched/empty, exactly as the
  template carries them.

## What's still unverified

1. **S6 opening a LightCanvas-exported file with this exporter's output.** The spike's
   simpler file proved the pipeline on Aug 21; this exporter's output (above) has not
   yet been opened. This is the acceptance test.
2. **Whether S6 honors `startIntensity`/`endIntensity` ramps on motion-effect track
   rows** the way the reference file suggests (used for pixel "fade" blocks).
3. **The "LightCanvas Beats" timing grid appearing correctly** in S6's grid picker.
4. **Colorwash with two enabled colors** (reference file shows 1, 2, and 6-color lists;
   we emit 1 or 2).
5. **Real-hardware playback** — depends on the USB485 adapter arriving and the bench
   test in the hardware doc §9.

## Where things live

- Exporter: `src/lib/exports/loredit/` (`xml.ts`, `template.ts`, `mapping.ts`,
  `effects.ts`, `index.ts`)
- UI: `src/components/ExportDialog.tsx`, button in `src/app/(app)/project/[id]/page.tsx`
- Persistence: `sequence.loreditPropMap` (`editor-store.ts` setter, autosave schema)
- Verification: `scripts/loredit/verify-roundtrip.mts`, `scripts/loredit/verify-export.mts`
- Original spike (kept, still runnable): `scripts/loredit-spike/`
- Fixtures/outputs (gitignored paid content): `scripts/loredit-spike/test-fixtures/`
