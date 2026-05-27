# Agent 5 — State, Snap, Bridge, Export Adapter

## What I built

The non-rendering plumbing for the 3D layout system: a Zustand slice that owns
the per-fixture 3D placements + UI state, pure snapping utilities (anchor + grid),
a coordinate bridge that converts world coordinates into xLights / LOR /
normalized-2D space, and a pre-flight export adapter that turns each fixture's
polyline layout into per-pixel coordinates with validation warnings. All four
modules are plain JSON-safe / pure — no `three`, no React, no Supabase coupling.

## Public surface

### `src/lib/store/layout3d-slice.ts`

```ts
export type Layout3DTool = "select" | "pen" | "rect" | "circle";
export interface Layout3DSnapshot {
  fixtures3d: Record<string, Fixture3DLayout>;
  activeTemplateId: string;
}
export const useLayout3DStore: UseBoundStore<...>;
```

State:
- `fixtures3d: Record<fixtureId, Fixture3DLayout>` — persisted
- `activeTemplateId: string` — persisted (default `"colonial"`)
- `selectedIds: string[]`
- `activeTool: Layout3DTool` (default `"select"`)
- `snapEnabled: boolean` (default `true`)
- `showGrid: boolean` (default `true`)
- `showAnchors: boolean` (default `false`)
- `controlsEnabled: boolean` (default `true`) — read by `OrbitCamera`
- `highlightedAnchorId: string | null` — drives `AnchorVisualizer`

Actions: `setFixtureLayout(id, layout)`, `removeFixtureLayout(id)`,
`updateWaypoint(fixtureId, idx, pos)`, `setSelected(ids)`, `addSelected(id)`,
`toggleSelected(id)`, `clearSelection()`, `setTool(tool)`, `toggleSnap()`,
`toggleGrid()`, `toggleAnchors()`, `setTemplate(id)`, `setControlsEnabled(on)`,
`setHighlightedAnchor(id|null)`, `hydrate(snapshot)`, `toSnapshot(): Layout3DSnapshot`.

Middleware: `subscribeWithSelector(immer(...))` — matches the existing
`editor-store.ts` pattern minus `temporal` (no undo for now; can be layered later).

### `src/lib/3d/snap.ts`

```ts
snapToAnchor(point: Vec3, surfaces: AnchorSurface[], radius: number): SnapResult
snapToGrid(point: Vec3, step: number): Vec3
snapPoint(point, surfaces, gridStep, snapEnabled): SnapResult
```

- Anchor types: point (distance to `worldPosition`), edge (closest point on
  segment `worldPosition`→`endPosition`), face (projected onto plane).
- Per-anchor effective radius = `min(surface.snapRadius, radius arg)`.
- `snapPoint` tries anchor first (with `Number.POSITIVE_INFINITY` radius so the
  per-anchor `snapRadius` wins), falls back to grid.

### `src/lib/3d/coordinate-bridge.ts`

```ts
worldToXLightsCoord(point, template): XLightsCoord    // 0..100 per axis, clamped
worldToLORCoord(point, template): LORCoord            // meters * 100
worldToNormalized2D(point, template): { x, y }        // 0..1 top-down
```

Bounding box: `[-w/2-2, w/2+2] × [0, wallHeight + (w/2)*roofPitch + 2] × [-2, depth+2]`.
World origin = front-center on ground, Y up, Z+ into the scene (matches
`house-templates.ts`).

### `src/lib/3d/export-adapter.ts`

```ts
getFixtureExportData(fixture, layout|undefined, template): FixtureExportData | null
validateExport(fixtures, layouts): ExportWarning[]
```

- Interpolates `fixture.pixelCount` samples evenly along the polyline using
  arc-length parametrization. Open paths sample `[0, totalLen]` inclusive;
  closed paths sample `[0, totalLen)` so endpoints don't duplicate.
- Returns null if no layout for that fixture.
- Validation: warn on missing/empty layout, error on overlapping channel
  ranges within the same universe.

## Decisions affecting downstream code

- **Persistence is decoupled.** The slice never touches Supabase. Orchestrator
  must wire autosave via `useLayout3DStore.subscribe(s => s.fixtures3d, ...)`
  (or similar) and call `toSnapshot()` to get the JSONB-safe payload. On
  project load, call `hydrate(snapshot)`. This keeps the slice unit-testable
  and avoids the autosave loop that's bitten us elsewhere.
- **No `three` imports anywhere in these files.** State is plain `Vec3 = {x,y,z}`.
  Renderers must convert at the boundary.
- **No `temporal` (undo) middleware on this slice yet.** The editor store has
  undo for sequence/fixture edits; if 3D-layout undo is needed it should be
  added in a follow-up so we can tune `partialize` separately from the existing store.
- **`snapPoint` calls `snapToAnchor` with infinite radius** so the per-anchor
  `snapRadius` is the only gate. Callers that want a global cap should call
  `snapToAnchor` directly with `ANCHOR_SNAP_RADIUS`.
- **xLights bounding box adds 2 m padding on every side**, so a fixture placed
  exactly at the house edge does not normalize to 0 or 100. If downstream
  consumers want tighter bounds, change `getBoundingBox` in `coordinate-bridge.ts`.
- **`interpolateAlongPath` lives privately in `export-adapter.ts`.** Did not
  reuse Agent 3's renderer helpers to avoid a cross-agent coupling that could
  break this module if their internals shift. If we want one shared
  implementation later, lift it into `src/lib/3d/path.ts`.

## Known limitations / TODOs

- No undo/redo for 3D layout mutations (see above).
- `validateExport` does not currently verify that fixtures stay inside the
  house bounding box — only channel overlap and presence. Add a "fixture outside
  bounds" warning once we agree on the policy (clamp vs error vs warn).
- `getFixtureExportData` defaults `universe` to 1 when undefined; confirm this
  matches what the xLights / LOR export writers expect.
- `closestPointOnPlane` in `snap.ts` does not bound the face to its visible
  extent (we don't have width/height on `AnchorSurface` yet). For wall faces
  this means the projected point can land outside the actual wall. Add face
  extents to `AnchorSurface` if/when needed.

## Verification

`npx tsc --noEmit` from `/home/user/lightshow` — clean (exit 0).
