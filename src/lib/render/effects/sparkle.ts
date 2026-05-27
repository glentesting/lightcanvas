import type { EffectFn, RGB } from "./types";
import { hexToRgb, lerpRgb, scale, seededRandom } from "./utils";

export const sparkle: EffectFn = ({ block, fixture, t }) => {
  const { color1, color2, intensity, speed, density = 0.4 } = block.params;
  const rgb1 = hexToRgb(color1);
  const rgb2 = color2 ? hexToRgb(color2) : rgb1;
  const n = fixture.pixelCount;
  const localT = (t - block.start) * speed;
  return Array.from({ length: n }, (_, i) => {
    const seed = Math.floor(localT * 15) * n + i;
    if (seededRandom(seed) > density) return [0, 0, 0] as RGB;
    const colorMix = seededRandom(seed + 2);
    const rgb = lerpRgb(rgb1, rgb2, colorMix);
    const decay = 1 - ((localT * 15) % 1);
    return scale(rgb, decay * intensity);
  });
};
