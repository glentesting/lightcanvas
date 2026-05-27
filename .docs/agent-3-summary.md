# Agent 3 — Fixture Rendering Layer

## What I built

A self-contained set of R3F components that take placed `Fixture` records plus
their `Fixture3DLayout` entries and render them inside the existing `Scene3D`
canvas. Strand-style fixtures render as a Catmull-Rom tube along the layout
polyline; point-style fixtures render as one emissive sphere per layout point.
Selection state is shown via an outline tube (strand) or amber ground ring
(point), and selected strands expose draggable waypoint handles that fire an
upward callback (the actual drag math is owned by the interaction layer). A
`FixtureGhost` component renders semi-transparent preview shapes during
sidebar drag-in. None of these components touch the store — all data flows
through props. A small pure-utility module (`src/lib/3d/fixture-renderer.ts`)
provides arc-length pixel sampling and a deliberately minimal effect→color
helper so the live 3D preview can hint at color without coupling to the full
render pipeline.

## Exported symbols

### `src/lib/3d/fixture-renderer.ts`

- `DEFAULT_PIXEL_COLOR: [number, number, number]` — `[0.18, 0.15, 0.1]` warm-white dim baseline.
- `interpolateStrandPoints(layout: Fixture3DLayout, pixelCount: number): Vec3[]` — uniform arc-length sampling. Handles closed paths (no seam duplicate), degenerate (0/1-point) layouts, and zero-length paths.
- `getFixtureColor(effect, t, pixelIndex, pixelCount): [number, number, number]` — `effect` is the loose `{ id?, effect?, color?, startSec?, endSec? }` projection. Today: null→default; `chase`→traveling warm pulse along pixel index; explicit `color`→solid; otherwise default.

### `src/components/editor/scene3d/fixtures/`

- `FixtureLayer({ fixtures, layouts, selectedIds, activeEffectsByFixtureId, playheadSeconds, onSelect, onWaypointDrag? })` — top-level. Skips fixtures with no layout entry.
- `StrandFixture3D({ fixture, layout, selected, effectAtPlayhead, playheadSeconds, onSelect, onWaypointDrag? })`
- `PointFixture3D({ fixture, layout, selected, effectAtPlayhead, playheadSeconds, onSelect, onWaypointDrag? })`
- `FixtureGhost({ kind, position, snapped })`

## Decisions affecting downstream

- **Strand vs point split** lives in `FixtureLayer` as a single `STRAND_KINDS` set: `roofline | mega-tree | mini-tree | arch | matrix` → strand; `window-outline | bush | custom` → point. Matrix is a strand because the wiring path is the natural rendering primitive; per-cell matrix rendering is a future enhancement.
- **`EffectBlock` shape**: I did NOT consume `EffectBlock` directly. The 3D layer takes a thin `{ id?, effect?, color?, startSec?, endSec? }` projection. The orchestrator/integration step is responsible for collapsing the active `EffectBlock` (from `@/lib/timeline/types`) into this projection per fixture at the current playhead. This decouples the scene from timeline internals and from the future render pipeline. Note: real `EffectBlock` has `effectId` (not `effect`) and color lives in `params.color1`. The integration adapter needs to map `block.effectId → effect` and `block.params.color1 → color`.
- **Color path**: tubes use a single averaged color (16-sample mean) driving `meshStandardMaterial.emissive`. Point fixtures color per-point. Per-pixel tube coloring (vertex colors) is intentionally deferred — current real-time visual fidelity is "good-enough preview", not export-accurate.
- **Waypoint drag contract**: `StrandFixture3D` only fires `onWaypointDrag(fixtureId, waypointIndex, currentPos)` on `pointerDown`. It does NOT capture the pointer, raycast, or commit moves. The interaction layer (Agent 4) must take over from there.
- **Click selection**: shift / meta / ctrl all count as "additive" — passed as the second arg to `onSelect`.
- **Coordinate boundary**: all `Vec3` → tuple conversions happen inside these components via `vec3ToTuple`. Store/props stay in `Vec3` shape.

## Known limitations / TODOs

- Curve for strand fixtures is always Catmull-Rom with tension 0.5; for true straight-line rooflines this produces a near-straight tube but technically interpolates. Acceptable today; revisit if rooflines look bowed.
- `interpolateStrandPoints` is computed and immediately discarded in `StrandFixture3D` (kept inside a `void useMemo` so the future per-pixel tube mode is a one-line swap). No runtime cost beyond the memo.
- No `<Instances>` optimization yet. With <50 fixtures this is fine; once the layer exceeds that, point-fixture spheres are the obvious instancing candidate.
- `FixtureGhost` shapes are silhouettes only — they don't reflect actual pixel counts or geometry params.
- `getFixtureColor` only implements `chase` plus solid color. Twinkle, strobe, fade, sparkle, wave, pulse, wash, meteor, firework all fall through to the solid `effect.color` path or default. Real fidelity is the render pipeline's job.
- `meshBasicMaterial side={2}` on point-fixture selection rings uses the numeric `THREE.DoubleSide` value to avoid an extra import; if Three's enum value ever shifts this would break (it won't — it's part of the public API).

## Verification

`npx tsc --noEmit` from `/home/user/lightshow` exits 0.
