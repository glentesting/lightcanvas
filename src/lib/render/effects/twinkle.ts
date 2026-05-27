import type { EffectFn } from "./types";
import { hexToRgb, scale, seededRandom } from "./utils";

export const twinkle: EffectFn = ({ block, fixture, t }) => {
  const { color1, intensity, speed, density = 0.3 } = block.params;
  const rgb = hexToRgb(color1);
  const n = fixture.pixelCount;
  const localT = (t - block.start) * speed;
  return Array.from({ length: n }, (_, i) => {
    const seed = Math.floor(localT * 10) * n + i;
    const v = seededRandom(seed) < density ? seededRandom(seed + 1) * intensity : 0;
    return scale(rgb, v);
  });
};
