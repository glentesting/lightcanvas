import type { EffectFn, RGB } from "./types";
import { hexToRgb, scale } from "./utils";

export const meteor: EffectFn = ({ block, fixture, t }) => {
  const { color1, intensity, speed, trailLength = 12 } = block.params;
  const rgb = hexToRgb(color1);
  const n = fixture.pixelCount;
  const localT = (t - block.start) * speed;
  const geo = fixture.geometry;

  // Mega-tree: meteor falls down each strand
  if (fixture.kind === "mega-tree" && geo?.strandCount && geo.strandCount > 1) {
    const strandCount = geo.strandCount;
    const pixelsPerStrand = Math.floor(n / strandCount);
    const pixels: RGB[] = Array.from({ length: n }, () => [0, 0, 0] as RGB);
    for (let s = 0; s < strandCount; s++) {
      // Stagger meteor start per strand
      const stagger = s * 0.15;
      const headPos = Math.floor(((localT + stagger) * pixelsPerStrand * 0.8) % (pixelsPerStrand + trailLength));
      for (let p = 0; p < pixelsPerStrand; p++) {
        const dist = headPos - p;
        if (dist >= 0 && dist < trailLength) {
          const brightness = (1 - dist / trailLength) * intensity;
          const idx = s * pixelsPerStrand + p;
          if (idx < n) pixels[idx] = scale(rgb, brightness * brightness);
        }
      }
    }
    return pixels;
  }

  // Default: pixel-linear meteor
  const headPos = Math.floor((localT * n * 0.8) % (n + trailLength));
  return Array.from({ length: n }, (_, i) => {
    const dist = headPos - i;
    if (dist < 0 || dist >= trailLength) return [0, 0, 0] as RGB;
    const brightness = (1 - dist / trailLength) * intensity;
    return scale(rgb, brightness * brightness); // exponential fade
  });
};
