import type { Fixture } from "./types";

export type PixelGroup = {
  /** Indices into the fixture's pixel array that belong to this group */
  pixels: number[];
  /** 0..1 position of this group within its axis (used for phase calculations) */
  position: number;
};

/**
 * Returns the fixture's pixels organized into geometry-aware groups.
 * - Mega-tree: one group per strand.
 * - Matrix: one group per row (or per column if wired vertically).
 * - Everything else: one group containing all pixels (effect falls back to per-pixel linear behavior).
 *
 * Returning a single group is the signal to effects: "no special geometry, just iterate pixels."
 *
 * Pure: no side effects, no per-frame allocations beyond the returned arrays. Never throws —
 * partial or missing geometry falls through to the single-group default.
 */
export function getPixelGroups(fixture: Fixture): PixelGroup[] {
  const n = fixture.pixelCount;
  const geo = fixture.geometry;

  // Mega-tree: one group per strand. Matches chase/meteor/wave inline math:
  //   pixelsPerStrand = floor(n / strandCount); idx = s * pixelsPerStrand + p (clamped to < n)
  if (
    fixture.kind === "mega-tree" &&
    geo?.strandCount &&
    geo.strandCount > 1
  ) {
    const strandCount = geo.strandCount;
    const pixelsPerStrand = Math.floor(n / strandCount);
    const groups: PixelGroup[] = [];
    for (let s = 0; s < strandCount; s++) {
      const pixels: number[] = [];
      for (let p = 0; p < pixelsPerStrand; p++) {
        const idx = s * pixelsPerStrand + p;
        if (idx < n) pixels.push(idx);
      }
      groups.push({ pixels, position: s / strandCount });
    }
    return groups;
  }

  // Matrix: one group per row (horizontal wiring) or per column (vertical wiring).
  // Preserves chase.ts semantics exactly: horizontal when wiringDirection !== "vertical".
  if (fixture.kind === "matrix" && geo?.rows && geo?.cols) {
    const { rows, cols } = geo;
    const horizontal = geo.wiringDirection !== "vertical";
    const lineCount = horizontal ? rows : cols;
    const lineLen = horizontal ? cols : rows;
    const groups: PixelGroup[] = [];
    for (let line = 0; line < lineCount; line++) {
      const pixels: number[] = [];
      for (let p = 0; p < lineLen; p++) {
        const idx = horizontal ? line * cols + p : p * cols + line;
        if (idx < n) pixels.push(idx);
      }
      groups.push({ pixels, position: line / lineCount });
    }
    return groups;
  }

  // Default: single group containing every pixel. Effects iterate pixels directly.
  const pixels: number[] = new Array(n);
  for (let i = 0; i < n; i++) pixels[i] = i;
  return [{ pixels, position: 0 }];
}
