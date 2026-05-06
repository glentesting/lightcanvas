# V2-05 — Extended Fixture Geometry

Add detailed geometry fields to complex fixture types. Without these, effects on trees and matrices render incorrectly on real hardware.

## Why this matters

A "Chase" effect on a mega tree with 16 strands needs to know the strand arrangement to chase correctly across strands. A text-scroll effect on a matrix needs to know rows and columns. Without this data, xLights can't position pixels correctly in the model.

## Additions by fixture type

### Matrix (grid of pixels)
New fields in the fixture properties panel:
- **Rows** (integer, default: 16)
- **Columns** (integer, default: 32)
- **Wiring direction**: Horizontal rows / Vertical columns
- **Wiring pattern**: Linear (all left-to-right) / Alternating (zig-zag — most common)
- **Starting corner**: Top-left / Top-right / Bottom-left / Bottom-right

### Tree (mega tree)
New fields:
- **Strand count** (integer, default: 16)
- **Pixels per strand** (integer, default: 100)
- **Wiring**: strands run top-to-bottom or bottom-to-top
- **Direction**: strands go clockwise or counter-clockwise around the tree

Total pixel count is auto-calculated: `strands × pixels_per_strand`. Override the manual pixel count field with this calculated value.

### Arch
New fields:
- **Curve orientation**: Left arch / Right arch / Mirrored (two arches meeting at peak)
- **Start end**: Left / Right (which physical end is pixel #1)

### Single-line (roofline, pathway, etc.)
Already has direction. Add:
- **Start position**: Left / Right (which physical end is pixel #1) — maps from existing Direction field

## Data model

These are additional keys inside each fixture's JSONB data:
```typescript
geometry?: {
  // Matrix
  rows?: number;
  cols?: number;
  wiringDirection?: 'horizontal' | 'vertical';
  wiringPattern?: 'linear' | 'alternating';
  startCorner?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

  // Tree
  strandCount?: number;
  pixelsPerStrand?: number;
  strandDirection?: 'topDown' | 'bottomUp';
  rotationDirection?: 'clockwise' | 'counterClockwise';

  // Arch
  curveOrientation?: 'leftArch' | 'rightArch' | 'mirrored';
  startEnd?: 'left' | 'right';
}
```

## Effect rendering update

Update the Chase, Wave, and Meteor renderers to use geometry data when available:
- Chase on a tree: runs across strands in the correct direction
- Chase on a matrix: runs left-to-right along rows (or top-to-bottom along columns)
- Chase respects start end direction

## Export integration

Pass geometry fields through to `xlights_rgbeffects.xml`:
- Matrix: sets `parm1=[cols]`, `parm2=[rows]`, `ZigZag=[alternating ? 1 : 0]`
- Tree: sets `parm1=[strands]`, `parm2=[pixelsPerStrand]`
- Arch: sets `parm1=[pixelCount]`, orientation flag

## Acceptance

- Matrix fixture properties panel shows row/col/wiring fields
- Tree fixture shows strand/pixels-per-strand fields
- Arch fixture shows curve orientation and start end
- Chase effect on a tree runs in the correct strand direction in preview
- Generated rgbeffects.xml includes geometry attributes for complex fixtures
- Simple fixtures (roofline, bush) are unaffected
