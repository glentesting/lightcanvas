# Layout view — correction prompt for Claude Code

The current build of the Layout tab has drifted from the approved
design (`LightCanvas Prototype.html` in the design project). Use this
document to bring it back in line. Do **not** invent new features
or visual elements that aren't called out below.

## Ground truth

The single source of truth is the prototype: `LightCanvas Prototype.html`
plus `editor-layout.jsx`, `house.jsx`, and `editor-data.jsx` in the
design project. If anything in this document conflicts with the
prototype, **the prototype wins**.

## What to fix (in order)

### 1. Remove the "House style" switcher
The strip showing `House: Ranch · Two-Story · Craftsman · Custom`
above the canvas was not in the design. Delete it. The Layout tab
has a single stylized house. Replacement is via a "Replace photo"
button inside the house's hover overlay (or a Project Settings
modal — see `06-fixtures-and-layout.md`), not a top-of-canvas tab
strip.

### 2. Restore the stylized house illustration
The current house is a thin wireframe — that's a placeholder. Use
the SVG illustration in `house.jsx` (copy it verbatim into a
client component `<House />` under `components/editor/house.tsx`).
Key qualities:
- Warm cream sky background, not white
- Filled roof, walls, windows, door — readable as a house from
  across the room
- Bushes in front, mega tree to the right, mini trees flanking
  the door, arches on the walkway
- Optional `snow` prop for falling snow particles in Preview mode
- Accepts a `lights` prop: `{ roofline: {color, intensity}, ... }`
  to drive Preview animations

### 3. Restore the toolstrip
A floating pill-shaped toolbar centered at the top of the canvas
with these tools (in this order):
- Select (V)
- Draw fixture / Pen (P)
- Rectangle (R)
- Tree / Circle (C)
- divider
- Snap to grid (toggle)

Plus, top-left of the canvas: a Freeform / Grid snap segmented
toggle. See `editor-layout.jsx` lines ~22–60.

### 4. Default fixture set
A new project must seed 6 fixtures, not 3. From `editor-data.jsx`:
roofline (220px ×1), windows (32px ×4), bushes (60px ×3), mega
tree (480px ×1), mini trees (50px ×2), arches (50px ×3). Total
988 pixels. This is the "Wizards in Winter" starter pack — every
new project gets it.

### 5. Pre-place fixtures on the default house
Each fixture in the starter pack has known coordinates on the
default house (see the SVG path overlays in `editor-layout.jsx`
lines ~85–135). Don't ship empty — ship populated. User edits
from there.

### 6. De-duplicate the fixture list
- Left sidebar "FIXTURES" section: keep — it's the library /
  navigator. Compact rows, click to focus.
- Right panel "Fixtures" header + scrolling list: **delete**.
  Replace with **Properties** for the currently selected fixture
  (Pixels / Universe / Start ch. / Direction — 2×2 grid of
  inputs). When nothing is selected, show a quiet empty state
  with a "Click a fixture in the canvas or sidebar" message.

### 7. Tab-aware left sidebar sections
The left sidebar shows different sections depending on the active
tab:
- **Audio Timeline tab:** Song · Layout · Sequence (effects
  palette) · AI Actions
- **Layout tab:** Song · Fixtures · AI Actions  *(no Effects)*
- **Preview tab:** Song · AI Actions

Effects don't belong on the Layout tab. Hide that section there.

### 8. AI Actions visual hierarchy
"Generate sequence" is the primary action — render it as a sky-
blue filled button with the Sparkles icon, full width. The other
three (Analyze audio, Refine timing, Generate palette) are
secondary — outlined buttons, left-aligned with their icons.
Right now they're all the same flat style.

### 9. Top bar polish
- LightCanvas logo (sky-blue mark) at the very left, before the back
  arrow… actually after the back arrow per the prototype. Order:
  back arrow · vertical divider · logo · breadcrumb.
- Breadcrumb: `My shows / [project name] [pencil icon to rename]
  · unsaved` — the "unsaved" indicator is small, color
  `var(--ink-4)`, only visible when state is dirty.
- Song chip: `🎵 [song name] · [duration]` in a soft panel
  background, not raw text.
- Order of right-side buttons: AI Actions (with `⌘K` kbd hint) ·
  Save · Export (primary).

### 10. Properties panel content (when a fixture is selected)
2×2 grid:
| Pixels (number)        | Universe (number)   |
| Start channel (number) | Direction (select: L→R / R→L) |
Below the grid, a destructive "Delete fixture" link in muted red.

## Acceptance

When I open `/editor/[id]` and click the Layout tab on a fresh
project:
- I see the stylized illustrated house, NOT a wireframe
- I see 6 pre-placed fixtures highlighted on the house
- The toolstrip and Freeform/Grid toggle are visible
- The right panel shows Properties (or its empty state), not a
  duplicate fixture list
- The left sidebar has Song / Fixtures / AI Actions — no Effects
  section
- Generate sequence is visually the primary AI action

## What NOT to add

- House style presets (Ranch / Two-Story / Craftsman) — out of
  scope, will be addressed in v2
- A separate "Add fixture" modal — keep the existing inline
  `+ Add` button at the bottom of the sidebar list
- Any new icons or buttons not in the prototype
