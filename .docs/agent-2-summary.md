# Agent 2 — House + Anchors

## What I built

Three parametric house templates (`colonial`, `modern`, `cottage`) and the full
render + snap-anchor stack: pure parametric geometry from a `HouseTemplate3D`
data object, a `computeSurfaces` / `useSurfaces` pair that derives the named
`AnchorSurface[]` for rooflines, gutters, windows, doors, bush row, driveway,
and yard, a glowing amber `AnchorVisualizer` that handles edge / face / point
anchors with a gentle scale pulse, and a top-level `House3D` component that
composes geometry + highlight + optional debug-dot picking. House origin is
front-center on the ground; +Z runs into the scene, +X right, +Y up. All units
meters. Lights-mode warm cream palette only.

## Exports

### `@/lib/3d/house-templates`
- `HOUSE_TEMPLATES: Record<string, HouseTemplate3D>` — keyed by id
- `HOUSE_TEMPLATE_LIST: HouseTemplate3D[]` — for menus / pickers
- `getHouseTemplate(id: string): HouseTemplate3D` — throws on unknown id

### `@/components/editor/scene3d/house/House3D`
- `House3D({ templateId, showAnchors?, highlightAnchorId?, onAnchorClick? })`

### `@/components/editor/scene3d/house/HouseGeometry`
- `HouseGeometry({ template: HouseTemplate3D })` — pure render

### `@/components/editor/scene3d/house/AnchorSurfaces`
- `computeSurfaces(template: HouseTemplate3D): AnchorSurface[]` — pure, callable outside React (snap module can import this directly)
- `useSurfaces(template): { map: Map<string, AnchorSurface>; list: AnchorSurface[] }` — memoized React hook

### `@/components/editor/scene3d/house/AnchorVisualizer`
- `AnchorVisualizer({ surface: AnchorSurface | null, visible: boolean })`

## Anchor IDs emitted

Stable ids consumers can rely on:
- `roofline-front`, `roofline-back`, `roofline-peak` (peak only when `roofPitch > 0`)
- `gutter-front` (same world coords as roofline-front but flagged with a downward normal so consumers can route gutter-style fixtures distinctly)
- `window-<wall>-<index>` (`wall` is `front|back|left|right`, index matches array order in template.windows)
- `door-front` (canonical id for the first front door) or `door-<wall>-<idx>` otherwise
- `bush-row`
- `ground-driveway` (only when template has a garage)
- `ground-yard`

## Decisions / notes for downstream agents

- **Wall offset convention**: `WindowSpec.x` / `DoorSpec.x` are measured from the LEFT end of the wall when looking AT it from outside. The frame helpers in both `HouseGeometry` and `AnchorSurfaces` translate to world coords consistently — keep that convention if you add walls.
- **`gutter-front` aliases `roofline-front` in world position** but has a downward-facing normal. Snap module should treat them as distinct anchors so fixture defaults differ.
- **`ground-driveway` is only emitted when `template.garage` is set.** Cottage has none.
- **Garage extends INTO -Z** (in front of the house) — it sits on the front of the property, attached to the front wall.
- **Anchor `snapRadius`** is `ANCHOR_SNAP_RADIUS` (0.6 m) from constants — uniform across all anchors today.
- **Bush-row anchor `worldPosition.y`** is a rough top-of-bush height (~0.68 m). If you change bush sphere size in `HouseGeometry`, sync it.
- The `Shape` for pitched gables comes from a plain `import { Shape } from "three"` — no lazy `require`. Pitched gables render double-sided (`side={2}`) so they read from inside the geometry too.

## Limitations / TODO

- No interior detail (just exterior shell). Fine for layout-mode use.
- Roof slopes are simple boxGeometry rotated about z — overhang at the gable ends is fixed at 0.3 m. Tweak `overhang` in `PitchedRoof` if needed.
- `AnchorVisualizer` uses a single global pulse — if many anchors became simultaneously visible (not the current intent — only one at a time) the pulse would all be in sync.
- `DebugAnchorDot` dots are visible only when `showAnchors=true`; they're not the production "click to attach to anchor" UX (that's owned by the interaction layer).
- `npx tsc --noEmit` passes clean.
