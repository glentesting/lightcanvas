# .loredit Export Spike — Findings

**Date:** 2026-08-21
**Goal:** prove LightCanvas can write a `.loredit` that LOR S6 v6.6.12 opens cleanly.
**Code:** `scripts/loredit-spike/` (`xml.mjs`, `inventory.mjs`, `roundtrip.mjs`, `template-fill.mjs`).
Standalone Node scripts; no app code touched. Reference file and all outputs live under
`scripts/loredit-spike/test-fixtures/`, which is gitignored (paid content, never pushed).

## TL;DR

- **Round-trip: byte-identical.** Parse the 11 MB purchased sequence, regenerate it
  from structure alone, and the output matches the original byte for byte — on the
  Carol of the Bells file **and all five official LOR sample .loredit files**.
- **Template-fill: works.** Stripped all 50,695 effects, kept PreviewClass and
  TimingGrids untouched, wrote a new 16-effect sequence (3 AC props with INTENSITY
  ramps + 2 RGB pixel props with colorwash motion effects) to a valid new file.
- **The one test that matters is still pending:** opening
  `scripts/loredit-spike/test-fixtures/output/spike-template-fill.loredit`
  in S6 v6.6.12. That's a manual GUI step — do it next.
- **Confidence this becomes a working exporter: high (8/10).** The file format is no
  longer the risk. The remaining work is effect translation, not format decoding.

---

## Task 1 — Parse results (reference: Carol of the Bells, 10,983,153 bytes)

Parser reads the full file in ~200 ms. Structure:

- **Props: 265 PropClass** — Traditional (AC): **62**, RGB (pixel): **91**,
  DumbRGB: **112**. All DeviceType=LOR. Plus **46 PropGroup** definitions.
- **Effects: 50,695** across 311 SeqProps (265 props + 46 groups; groups carry no
  effects in this file).
- **Timing marks: 1,478** in `TimingGridFree` "Default Free" (0…19389 cs), plus an
  empty `TimingGridFixed` "Fixed 0.05" (spacing=5).
- **Settings values:** `INTENSITY` ×33,880, `SHIMMER` ×828, `TWINKLE` ×16, motion
  effects ×15,971.
- **Motion mixers:** `Mix_Alpha_Blend`, `Mix_Average`, `Mix_Rt_Reveals_Lt`.
  **Motion effect names in this file:** colorwash (11,578), curtain (3,332), ripple,
  bars, blendedbars, plasma, mystify, spirals, spinner, garland, archimedesspiral,
  none. **Additional names in the LOR samples:** picture, picturexy, text, audio,
  spinfade, butterfly, hatchpattern, pinwheel, movingshapes, starfield.
- **ChannelGrid networks:** Regular (394 segments), Aux A (76), Aux B (16), Aux C (17).

### Grammar rules the notes didn't state (important)

1. **`channel` rows and `track` rows are disjoint worlds.** `<channel>` rows carry
   ONLY classic effects (INTENSITY/SHIMMER/TWINKLE). `<track>` rows carry ONLY
   motion-effect settings strings. Never mixed, 50,695/50,695 effects conform.
2. **StringType decides the row type.** Traditional and DumbRGB SeqProps contain
   `<channel row col color>`; RGB (pixel) SeqProps contain `<track>` elements —
   these are the S6 motion-effect rows ("Whole Tree 01", "Strand 1"…), each with an
   optional sub-region rectangle (`subx/suby/subw/subh`, fractions of the prop).
3. **DumbRGB color is a signed 32-bit ARGB int in `intensity`.** e.g.
   `intensity="-65536"` = 0xFFFF0000 = full red. This is how the singing-tree face
   props in this very file are sequenced (e.g. "Face-Elden Mouth \"OH\"") — directly
   relevant to the owner's 4 singing trees.
4. **`effect` carries either `intensity` OR `startIntensity`+`endIntensity`**, never
   both (25,725 ramp / 24,970 constant in the reference).

### Attributes/elements found that the notes didn't cover

- **Root `<sequence>`:** `id` (GUID), `WaveHeight`, `TimingGridIdx`,
  `DragEventsWithTimings`, `DefaultMotionEffectRows`, `ChaseClearFirst`,
  `ChaseSameRowType`, `ChaseType`, `AudioAnalysisLevel`, `author`, `createdAt`,
  `musicArtist`, `musicTitle`, `musicAlbum`, `NameAreaWidth`, `ZoomWidth`,
  `ZoomHeight`, `GridView`, `StartColor`, `EndColor`.
- **PropClass:** `BulbShape`, `Comment`, `CustomBulbColor`, `DimmingCurveName`,
  `IndividualChannels`, `LegacySequenceMethod`, `MaxChannels`, `Opacity`,
  `MasterDimmable`, `PreviewBulbSize`, `RgbOrder`, `MasterPropId`, `SeparateIds`,
  `StartLocation`, `TraditionalColors`, `TraditionalType`, `EffectBulbSize`, `Tag`,
  and `Parm1`–`Parm8` (shape/geometry parameters, e.g. strand count / pixels per
  string on trees).
- **shape:** `OffsetX/Y`, `ScaleX/Y`, `Radians`, `CustomWidth/Height`, `CellSize`,
  `CustomGrid`, `BackgroundImage`, `BackgroundTransparency`; plus a
  `<BackgroundImage>` element inside PreviewClass.
- **SeqProp:** `EnablePixelChannels`, `OverlayMotionRows`, `DisplayGroupMembers`;
  children `<track>` and `<MotionRowDefaults>/<MotionRowDefault>` (per-prop saved
  row layouts, mirroring track attrs).
- **PropGroup** with `<member id orientation top left>`; `Arrangement`,
  `PreviewResFactor`.
- **PropViews:** `PropView name verson zoom scrollh scrollv` (note LOR's own typo
  "verson") with `ViewMember id category expand`.
- **In the samples only:** `<loopLevels>/<loopLevel>` (chase/loop sequences),
  `<picture>` payloads inside `<pictures>`, and a distinct **chase settings grammar**
  on channel effects whose settings start with a number (`"2|…"`, `"10|…"`).

## Task 2 — Round-trip

Two serializers were tested against the original bytes:

1. **Raw-preserving** (echo the parse tree): **byte-identical.** Proves the parser
   loses nothing.
2. **Structural regeneration** (throw away all original whitespace; rebuild from
   convention: UTF-8 BOM, CRLF, 2-space indent, ` />` self-closing, `&quot;`/`&amp;`
   escaping, no trailing newline): **also byte-identical** — on the 11 MB reference
   **and all 5 official LOR sample files** (spanning 5.4.0-era through 6.2.0
   content, all saveFileVersion=15). This is the result that matters: we can emit
   LOR's exact file format from a data structure, not just echo bytes.

Generation takes ~80 ms for the 11 MB file. Performance is a non-issue.

## Task 3 — Template fill

`template-fill.mjs` does exactly the prescribed test:

- PreviewClass and TimingGrids carried over **verbatim** (verified structurally
  identical to the original).
- All 50,695 effects deleted; emptied rows become self-closing, matching how LOR
  writes unused rows.
- New sequence written:
  - `01.01/01.02/01.03 AC Top Window` (Traditional): 4 INTENSITY blocks each
    (solid / ramp-up / ramp-down / solid), start/end snapped to real timing marks.
  - `RGB Tree 16x25-360` (pixel, 8×150-circuit ChannelGrid): 3 colorwash motion
    effects on its "Whole Tree 01" track.
  - `RGB Tree 32x50-360`: 1 colorwash.
- Output: `test-fixtures/output/spike-template-fill.loredit` (1.87 MB).
- Verified: re-parses with the spike parser (16/16 effects), and loads cleanly in
  an independent XML parser (.NET XmlDocument: 265 props, 16 effects).

One deliberate deviation from the task wording: the RGB props got colorwash motion
effects rather than INTENSITY blocks, because classic INTENSITY on a pixel `<track>`
row appears **zero** times in 50,695 reference effects — it's off-grammar. AC and
DumbRGB channels are where INTENSITY lives.

**Not yet done: opening the file in S6 v6.6.12.** That is a manual GUI step and the
spike's true acceptance test. If S6 opens it, plays it against the MP3, and the five
props light as described, the format problem is solved.

## Task 4 — What a real exporter needs that this spike didn't cover

1. **The layout strategy — the big architectural decision.** This spike reused a
   purchased PreviewClass. For the owner's own show, do NOT synthesize PropClass
   geometry from scratch. Instead: build his layout once in S6 (or start from any
   sequence saved against his S6 Preview), save an empty `.loredit`, and have
   LightCanvas **template-fill it** — exactly what this spike proved. Mapping
   LightCanvas fixtures → SeqProp ids becomes a one-time named mapping. Synthesizing
   a PreviewClass (shape points, Parm1–8, ChannelGrids for his Pixie16 units) is
   possible but is weeks of risk for zero benefit.
2. **Motion-effect settings composition.** The spike copied a colorwash settings
   string verbatim and it round-trips, but composing arbitrary ones (colors, speed,
   direction per effect type) requires decoding each `lightorama_<name>:…` param
   grammar. Colorwash's is readable (6 ARGB colors + flags + `full,full,single_color`);
   the mixer header `Mix_X|0|0|full|20|` fields (region + speed among them) need a
   few controlled experiments in S6. Budget: per-effect-type reverse engineering,
   colorwash/curtain/bars first — those three cover most of a musical show.
3. **Effect translation layer.** LightCanvas's 10 effects → (a) INTENSITY/SHIMMER/
   TWINKLE ramps for the 16 AC channels — near-trivial, the spike already writes
   these; (b) motion settings strings for pixel props; (c) packed-ARGB DumbRGB
   intensity values for singing-tree faces.
4. **Timing grid from beat detection.** Write LightCanvas's detected beats as
   `TimingGridFree` marks. Trivial (attribute per mark).
5. **Metadata correctness.** `musicFilename` must name the audio file S6 can find
   (samples show relative paths like `Samples\song.mp3`); totalCentiseconds from
   audio duration; fresh GUIDs for any new ids (standard GUID format).
6. **Unknowns that don't block but should be watched:** chase grammar
   (`loopLevels`, numeric settings prefixes) — skip chases initially; `MotionPaks`,
   `RgbAggregates`, `Subsequences`, `BeatChannels` — empty in all six files
   examined, emit empty; whether S6 tolerates missing UI attrs (`ZoomWidth` etc.) —
   irrelevant if we template-fill, since we preserve them.

## Verdict

- **Does round-trip work?** Yes — byte-identical, six for six files, including
  regeneration from pure structure.
- **Does template-fill work?** Yes — mechanically proven and independently
  validated; S6 open test pending (file is ready at
  `scripts/loredit-spike/test-fixtures/output/spike-template-fill.loredit`).
- **What's still unknown?** S6's acceptance of the file (the real test), and the
  parameter grammar inside motion-effect settings strings beyond copy-paste.
- **Honest confidence: 8/10** that this becomes a working exporter in weeks, not
  months — provided the exporter template-fills a layout created in S6 rather than
  synthesizing PreviewClass geometry. The format was the feared unknown; it turned
  out to be clean, regular, machine-written XML that we can now reproduce exactly.
  The residual risk is concentrated in motion-effect parameter semantics, which is
  testable one string at a time inside S6.

## Next step (manual, ~5 minutes)

Open S6 Sequencer → File → Open →
`scripts\loredit-spike\test-fixtures\output\spike-template-fill.loredit`.
Expected: opens with no errors, shows the full purchased layout, timing grid
present, and exactly five props with effects (three AC windows around 7–10 s,
two RGB trees around 10–14 s). Report any dialog or error text verbatim.
