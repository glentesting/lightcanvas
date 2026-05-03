# 06 — Fixtures & Layout View

A **fixture** is a strand of N pixels, addressable as `pixels[0..N-1]`. The Layout View places fixtures spatially on a stylized SVG of the user's house, so the Preview View can render lights at the correct positions.

## Default house templates

Three SVG templates ship with the app, in `public/house/`:
- `default.svg` — the stylized peaked-roof colonial from the prototype
- `modern.svg` — flat-roof modern
- `cottage.svg` — small bungalow

Each template defines named anchor regions as invisible `<path>` elements with `data-anchor="{name}"`:
- `roof-front`, `roof-side-left`, `roof-side-right` — for roofline strips
- `window-1`, `window-2`, … — window outlines auto-snap here
- `door-front` — wreaths
- `tree-spot-1`, `tree-spot-2`, `bush-row` — yard fixtures

Users can also upload a custom SVG (stored in `lumen-houses/`) — anchors are optional; without them everything is free-placed.

## Layout view UX

Two-column layout:
- **Left** (300px): Fixture list. Each row = one fixture from the project, with an "edit" toggle (renames it) and a "remove from layout" button (keeps fixture, removes its placement).
- **Right** (flex): The house SVG, 16:9, dropdown to switch template, "+ Add fixture" button.

Drag a fixture from the left list onto the SVG → its placement starts. For strand fixtures (roofline, mega tree, arches), the user clicks waypoints to define the path the strand follows; double-click ends. For point fixtures (windows, bushes), one click = placed.

```ts
// Stored on Fixture.layout
layout: {
  points: [{ x: 0.12, y: 0.34 }, { x: 0.84, y: 0.34 }], // normalized 0..1
  closed: false,
}
```

The renderer interpolates `pixelCount` evenly along the polyline.

## Add-fixture dialog

shadcn `<Dialog>`. Lists the 6 built-in templates (queried from `fixture_templates`). User picks one, customizes:
- Name (default: template name)
- Pixel count (default from template, editable)
- Start channel (auto-incremented from highest existing)

Adds to project's `fixtures[]` and to the sequence's `tracks[]`.

## Channel allocator

```ts
// lib/fixtures/library.ts
export function nextStartChannel(fixtures: Fixture[]): number {
  if (fixtures.length === 0) return 1;
  return Math.max(...fixtures.map(f => f.startChannel + f.pixelCount * 3)) + 1;
  // *3 for RGB; pixel-accurate model = 3 channels per pixel
}
```

xLights export needs these to not overlap. The Add-Fixture dialog warns if channels would overlap, lets the user override.

## Acceptance

- [ ] Default project has 6 fixtures listed but unplaced; layout SVG shows empty house
- [ ] Drag-place a roofline fixture along the roof — waypoints snap to the `roof-front` anchor when within 20px
- [ ] Place 4 window outlines; they auto-snap to `window-1..4`
- [ ] Removing a fixture from layout keeps it in the timeline
- [ ] Channel allocator prevents overlaps; warning appears if user manually edits a startChannel that conflicts
- [ ] Custom SVG upload renders the user's image without the anchor logic crashing
