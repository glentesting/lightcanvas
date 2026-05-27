import { getPixelGroups } from "@/lib/fixtures/geometry";
import type { EffectFn, RGB } from "./types";
import { hexToRgb, lerpRgb, scale } from "./utils";

export const wave: EffectFn = ({ block, fixture, t }) => {
  const { color1, color2, intensity, speed } = block.params;
  const rgb1 = hexToRgb(color1);
  const rgb2 = color2 ? hexToRgb(color2) : rgb1;
  const n = fixture.pixelCount;
  const localT = (t - block.start) * speed;
  const groups = getPixelGroups(fixture);

  // Multi-group: wave across groups (strand-by-strand). Each group gets a single color
  // derived from its normalized position; that color is applied uniformly across its pixels.
  if (groups.length > 1) {
    const pixels: RGB[] = Array.from({ length: n }, () => [0, 0, 0] as RGB);
    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      const phase = group.position * Math.PI * 2 + localT * Math.PI * 2;
      const v = (Math.sin(phase) + 1) / 2;
      const rgb = color2 ? lerpRgb(rgb1, rgb2, v) : rgb1;
      const px = scale(rgb, v * intensity);
      const groupPixels = group.pixels;
      for (let p = 0; p < groupPixels.length; p++) {
        pixels[groupPixels[p]] = px;
      }
    }
    return pixels;
  }

  // Single group: pixel-linear wave across all the fixture's pixels.
  return Array.from({ length: n }, (_, i) => {
    const phase = (i / n) * Math.PI * 2 + localT * Math.PI * 2;
    const v = (Math.sin(phase) + 1) / 2;
    const rgb = color2 ? lerpRgb(rgb1, rgb2, v) : rgb1;
    return scale(rgb, v * intensity);
  });
};
