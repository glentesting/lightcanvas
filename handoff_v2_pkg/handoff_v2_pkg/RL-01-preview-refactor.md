# RL-01 — Preview Panel Refactor

Remove the Preview tab entirely. Replace it with a persistent split-view editor where the preview is always visible above the timeline. This also fixes the existing preview rendering bug (nothing appears on screen).

## The problem with the current design

The Preview is behind a tab — users have to navigate away from the timeline to see their show. The core creative loop is: drag an effect → see it animate on the house. That loop is broken if preview requires a tab switch. This is the most important UX fix in the launch ready phase.

## What to build

### New editor layout

Replace the current three-tab layout (Audio Timeline / Layout / Preview) with:

```
┌─────────────────────────────────────────────────┐
│  TopBar (logo, breadcrumb, song chip, actions)  │
├──────────┬──────────────────────────────────────┤
│          │  PREVIEW PANEL (always visible)      │
│          │  ~35% of editor height               │
│  Sidebar │  House SVG with animated lights      │
│          │  Transport: play/pause/scrubber       │
│          ├──────────────────────────────────────┤
│          │  TIMELINE (always visible)           │
│          │  ~65% of editor height               │
│          │  Waveform + beat markers             │
│          │  Fixture tracks + effect blocks      │
└──────────┴──────────────────────────────────────┘
```

The Layout tab becomes a **separate full-page view** — navigate to it via a button in the sidebar or top bar. You don't need to see the floor plan while sequencing. That's a different task.

### Tab changes

- **Remove:** Audio Timeline / Layout / Preview tab system
- **Add:** A "Layout" button in the sidebar that navigates to the layout editor (`/project/[id]/layout`)
- The default editor route (`/project/[id]`) is now always the split-view: preview + timeline

### Preview panel (top region)

- Renders the house SVG with animated lights
- Transport controls: play / pause / stop, time display, scrubber
- Connects to the same transport store that the waveform uses — playhead is shared
- Reuses the existing render engine (`lib/render/`) — the logic is already correct
- Fix the existing rendering bug: inspect flex height constraints, ensure the SVG has a defined height, check that the render loop is connected to transport.currentTime

### Timeline (bottom region)

- Waveform (WaveSurfer) in the upper portion
- Fixture track rows below
- All existing timeline interactions unchanged
- The split between waveform and tracks within the timeline region can use a resizable divider

### Sidebar adaptation

- Remove tab-switching logic from sidebar
- Sidebar shows fixture list + effects palette at all times (no conditional content based on active tab)
- Add "Edit Layout" button that routes to layout view

## Resizable split

The user can drag the divider between preview and timeline to adjust the split. Store the ratio in localStorage. Default: 35% preview / 65% timeline.

## Acceptance

- Opening a project lands on split-view editor — no tab system visible
- Preview house animates correctly when transport is playing
- Timeline interactions (drag, resize, snap) work exactly as before
- Waveform and preview playhead stay in sync
- "Edit Layout" button in sidebar navigates to layout view
- Layout view navigates back to editor
- Preview rendering bug is fixed — lights animate visibly
- No console errors on load
- Existing undo/redo, autosave, keyboard shortcuts unaffected
