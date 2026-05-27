import { getPixelGroups } from "@/lib/fixtures/geometry";
import type { EffectFn, RGB } from "./types";
import { hexToRgb, scale } from "./utils";

export const meteor: EffectFn = ({ block, fixture, t }) => {
  const { color1, intensity, speed, trailLength = 12 } = block.params;
  const rgb = hexToRgb(color1);
  const n = fixture.pixelCount;
  const localT = (t - block.start) * speed;
  const groups = getPixelGroups(fixture);

  // Multi-group: a meteor falls down each group (strand). Stagger per group index, then
  // run the meteor head-and-trail math along the group's pixels.
  if (groups.length > 1) {
    const pixels: RGB[] = Array.from({ length: n }, () => [0, 0, 0] as RGB);
    for (let g = 0; g < groups.length; g++) {
      const groupPixels = groups[g].pixels;
      const groupLen = groupPixels.length;
      if (groupLen === 0) continue;
      const stagger = g * 0.15;
      const headPos = Math.floor(((localT + stagger) * groupLen * 0.8) % (groupLen + trailLength));
      for (let p = 0; p < groupLen; p++) {
        const dist = headPos - p;
        if (dist >= 0 && dist < trailLength) {
          const brightness = (1 - dist / trailLength) * intensity;
          pixels[groupPixels[p]] = scale(rgb, brightness * brightness);
        }
      }
    }
    return pixels;
  }

  // Single group: pixel-linear meteor across all the fixture's pixels.
  const headPos = Math.floor((localT * n * 0.8) % (n + trailLength));
  return Array.from({ length: n }, (_, i) => {
    const dist = headPos - i;
    if (dist < 0 || dist >= trailLength) return [0, 0, 0] as RGB;
    const brightness = (1 - dist / trailLength) * intensity;
    return scale(rgb, brightness * brightness); // exponential fade
  });
};
