import { getPixelGroups } from "@/lib/fixtures/geometry";
import type { EffectFn, RGB } from "./types";
import { hexToRgb, scale } from "./utils";

export const chase: EffectFn = ({ block, fixture, t }) => {
  const { color1, intensity, speed, direction = "forward", trailLength = 8 } = block.params;
  const rgb = hexToRgb(color1);
  const n = fixture.pixelCount;
  const localT = (t - block.start) * speed;
  const groups = getPixelGroups(fixture);

  // Multi-group: chase across groups (strand-by-strand or row/column-by-line) with uniform
  // per-group brightness. Brightness is a triangle wave keyed off the group index, matching
  // the original mega-tree / matrix inline math exactly.
  if (groups.length > 1) {
    const groupCount = groups.length;
    const groupPhase = (localT * 2) % groupCount;
    const pixels: RGB[] = Array.from({ length: n }, () => [0, 0, 0] as RGB);
    for (let g = 0; g < groupCount; g++) {
      const brightness = Math.max(0, 1 - Math.abs(g - groupPhase) * 0.5) * intensity;
      const color = scale(rgb, brightness);
      const groupPixels = groups[g].pixels;
      for (let p = 0; p < groupPixels.length; p++) {
        pixels[groupPixels[p]] = color;
      }
    }
    return pixels;
  }

  // Single group: pixel-linear chase along all the fixture's pixels.
  const headPos = (localT * n * 0.5) % n;
  return Array.from({ length: n }, (_, i) => {
    const idx = direction === "backward" ? n - 1 - i : i;
    let dist = (headPos - idx + n) % n;
    if (dist > n / 2) dist = n - dist;
    const brightness = dist < trailLength ? (1 - dist / trailLength) * intensity : 0;
    return scale(rgb, brightness);
  });
};
