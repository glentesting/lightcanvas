/**
 * Shared on-stage bounding sizes per fixture kind, in the 720×420 stage space.
 * Used by both the layout editor overlay (PropShape) and the night-stage
 * pixel-geometry expansion so the two always agree on where a prop's lights sit.
 */
export interface PropSize {
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export const PROP_SIZES: Record<string, PropSize> = {
  roofline:         { w: 380, h: 20, cx: 360, cy: 155 },
  "window-outline": { w: 44, h: 54, cx: 240, cy: 255 },
  bush:             { w: 56, h: 28, cx: 260, cy: 320 },
  "mega-tree":      { w: 64, h: 160, cx: 690, cy: 240 },
  "mini-tree":      { w: 36, h: 55, cx: 310, cy: 295 },
  arch:             { w: 80, h: 50, cx: 360, cy: 295 },
  matrix:           { w: 80, h: 50, cx: 500, cy: 240 },
};

export const DEFAULT_PROP_SIZE: PropSize = { w: 40, h: 40, cx: 360, cy: 210 };

export function propSize(kind: string): PropSize {
  return PROP_SIZES[kind] || DEFAULT_PROP_SIZE;
}
