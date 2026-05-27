import type { EffectFn, RGB } from "./types";
import { hexToRgb, lerpRgb, scale } from "./utils";

export const wave: EffectFn = ({ block, fixture, t }) => {
  const { color1, color2, intensity, speed } = block.params;
  const rgb1 = hexToRgb(color1);
  const rgb2 = color2 ? hexToRgb(color2) : rgb1;
  const n = fixture.pixelCount;
  const localT = (t - block.start) * speed;
  const geo = fixture.geometry;

  // Mega-tree: wave across strands
  if (fixture.kind === "mega-tree" && geo?.strandCount && geo.strandCount > 1) {
    const strandCount = geo.strandCount;
    const pixelsPerStrand = Math.floor(n / strandCount);
    const pixels: RGB[] = Array.from({ length: n }, () => [0, 0, 0] as RGB);
    for (let s = 0; s < strandCount; s++) {
      const phase = (s / strandCount) * Math.PI * 2 + localT * Math.PI * 2;
      const v = (Math.sin(phase) + 1) / 2;
      const rgb = color2 ? lerpRgb(rgb1, rgb2, v) : rgb1;
      const px = scale(rgb, v * intensity);
      for (let p = 0; p < pixelsPerStrand; p++) {
        const idx = s * pixelsPerStrand + p;
        if (idx < n) pixels[idx] = px;
      }
    }
    return pixels;
  }

  // Default: pixel-linear wave
  return Array.from({ length: n }, (_, i) => {
    const phase = (i / n) * Math.PI * 2 + localT * Math.PI * 2;
    const v = (Math.sin(phase) + 1) / 2;
    const rgb = color2 ? lerpRgb(rgb1, rgb2, v) : rgb1;
    return scale(rgb, v * intensity);
  });
};
