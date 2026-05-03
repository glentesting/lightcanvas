# 05 — Timeline: Drag, Resize, Snap, Multi-select, Undo, Shortcuts

This is the most complex slice. Build it incrementally — get drag working before resize, resize before multi-select, etc.

## Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Ruler (time + numbered downbeats)                                │
├────────────────┬─────────────────────────────────────────────────┤
│ Track header   │ Track content (effect blocks + waveform overlay)│
│ "Roofline"     │ ▓▓▓░░░░ ▓▓▓ ░░░░ ▓▓▓                            │
│ "Mega tree"    │ ░░ ▓▓▓▓▓▓▓ ░░░ ▓▓▓                              │
│ …              │ …                                               │
└────────────────┴─────────────────────────────────────────────────┘
                  ↑ shared horizontal scroll, vertical too
```

The waveform sits as a translucent overlay across all track contents (rendered once, behind the blocks).

## Coordinate math

Pure helpers in `lib/timeline/snapping.ts`:

```ts
export const secondsToPx = (s: number, zoom: number) => s * zoom;
export const pxToSeconds = (x: number, zoom: number) => x / zoom;

export function snapToBeat(t: number, beats: number[], threshold = 0.06): number {
  // threshold in seconds — within ~60ms of a beat? snap.
  let nearest = beats[0], best = Math.abs(t - beats[0]);
  for (const b of beats) {
    const d = Math.abs(t - b);
    if (d < best) { best = d; nearest = b; }
  }
  return best <= threshold ? nearest : t;
}
```

Snap is on by default; hold `Alt` while dragging to disable.

## Effect block component

```tsx
// effect-block.tsx
function EffectBlock({ block, fixture }: { block: EffectBlock; fixture: Fixture }) {
  const zoom = useTransportStore(s => s.zoom);
  const selected = useEditorStore(s => s.selectedBlockIds.has(block.id));
  const blockStyle = /* from EFFECTS registry — color from effectId */;

  const left = secondsToPx(block.start, zoom);
  const width = secondsToPx(block.duration, zoom);

  return (
    <div
      className={cn('absolute h-full rounded-md border', selected && 'ring-2 ring-accent')}
      style={{ left, width, background: blockStyle.bg, borderColor: blockStyle.border }}
      onMouseDown={handleDragStart}
      onContextMenu={(e) => { e.preventDefault(); openContextMenu(e, block.id); }}
    >
      <div className="resize-handle left" onMouseDown={handleResizeLeft} />
      <span className="block-label">{EFFECTS[block.effectId].name}</span>
      <div className="resize-handle right" onMouseDown={handleResizeRight} />
    </div>
  );
}
```

## Drag-from-palette

Effects in the sidebar are draggable. Use **dnd-kit** (`@dnd-kit/core`):

- Effect chip: `useDraggable({ id: 'palette:twinkle', data: { type: 'effect', effectId: 'twinkle' } })`
- Track lane: `useDroppable({ id: `track:${trackId}`, data: { type: 'track', trackId } })`
- On drop: insert an `EffectBlock` at the dropped X position (pxToSeconds), default duration 2s, snap to nearest beat

## Drag-existing block

Skip dnd-kit for moving existing blocks — pointer events give finer control. On `mousedown`:
1. Capture initial pointer X/Y, initial block start, initial track index
2. On `mousemove`: compute `deltaX → deltaSeconds`, `deltaY → deltaTrackIndex` (round to nearest row)
3. Apply via `moveBlocks(selectedIds, deltaSeconds, deltaTrackIndex)`
4. Snap final value on `mouseup`

If multiple blocks are selected, all move together; the lead block snaps and the rest move by the same delta (do not snap each independently — that'd misalign them).

## Resize

Same pointer-event pattern. Edge handles are 6px wide, `cursor: ew-resize`. Min duration: 0.1s. Resizing the start edge moves `start` and shrinks `duration`; resizing the end edge changes only `duration`.

## Multi-select

- Click: replace selection with `[id]`
- Shift+click: add/remove from selection
- Cmd+click: same as shift (Mac users)
- Drag-select rectangle: on empty timeline area, drag → marquee box, release → all blocks intersecting the box are selected
- Cmd+A: select all blocks
- Esc: clear selection

## Context menu

Right-click on a block → shadcn `<ContextMenu>`:
- Cut (Cmd+X)
- Copy (Cmd+C)
- Paste (Cmd+V) — paste at playhead
- Duplicate (Cmd+D) — duplicate to right of block
- Split at playhead (S)
- Delete (Backspace)
- Lock / Unlock (L)
- Properties → opens parameter panel

## Parameter panel

Below the timeline, hidden until a block is selected. shadcn `<Collapsible>` or a fixed-height bottom sheet (~140px). Shows the selected block's effect-specific params:
- All effects: color1, intensity, speed, easing
- Twinkle/Sparkle: density slider
- Chase: direction radio
- Meteor: trail length
- Firework: burst count

Live-update as the user drags sliders — debounce autosave by 300ms while a slider is being dragged so we don't spam the DB.

## Keyboard shortcuts (`lib/utils/keyboard.ts`)

| Key | Action |
|---|---|
| Space | Play / pause |
| ← / → | Seek -/+ 1 beat |
| Shift+← / Shift+→ | Seek -/+ 1 bar |
| , / . | Frame-step (-/+ 0.1s) |
| Cmd+Z / Cmd+Shift+Z | Undo / Redo |
| Cmd+S | Force-save (also runs autosave) |
| Cmd+A | Select all blocks |
| Cmd+D | Duplicate selection |
| Cmd+C / Cmd+V / Cmd+X | Copy / paste / cut |
| Backspace / Delete | Delete selection |
| S | Split at playhead |
| L | Lock / unlock selection |
| Esc | Clear selection / close panel |
| 1–9 | Jump to that effect in the palette as the active brush |
| + / - | Zoom in / out |

Register in a single hook `useEditorShortcuts()` mounted in `EditorShell`. Skip if `document.activeElement` is an input/textarea.

## Acceptance

- [ ] Drag an effect from the palette onto a track — block appears, snapped to nearest beat
- [ ] Drag a block 1 row down — block moves to the new track and re-renders correctly
- [ ] Hold Alt while dragging — snap is disabled, block can sit anywhere
- [ ] Shift-click 3 blocks, drag any one — all 3 move in lockstep
- [ ] Cmd+Z undoes a multi-block move as a single step (one history entry)
- [ ] Resize the right edge of a block; duration updates, start unchanged
- [ ] Right-click → Duplicate creates a copy adjacent; Cmd+Z undoes it
- [ ] Marquee-drag across a region selects every block touching the box
- [ ] Pressing Space while focused in the parameter panel's color input does NOT toggle play
