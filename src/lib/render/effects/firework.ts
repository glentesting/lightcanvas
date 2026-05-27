import type { EffectFn, RGB } from "./types";
import { hexToRgb, scale, seededRandom } from "./utils";

export const firework: EffectFn = ({ block, fixture, t }) => {
  const { color1, intensity, burstCount = 3 } = block.params;
  const rgb = hexToRgb(color1);
  const n = fixture.pixelCount;
  const burstInterval = block.duration / burstCount;
  const pixels: RGB[] = Array.from({ length: n }, () => [0, 0, 0] as RGB);

  for (let b = 0; b < burstCount; b++) {
    const burstTime = block.start + b * burstInterval;
    const elapsed = t - burstTime;
    if (elapsed < 0 || elapsed > 0.6) continue;

    const center = Math.floor(seededRandom(b * 7 + 3) * n);
    const radius = Math.floor(elapsed * n * 0.4);
    const fade = Math.max(0, 1 - elapsed / 0.6);

    for (let i = Math.max(0, center - radius); i < Math.min(n, center + radius); i++) {
      const dist = Math.abs(i - center) / Math.max(1, radius);
      const v = (1 - dist) * fade * intensity;
      if (elapsed < 0.08) {
        // Initial white flash
        pixels[i] = scale([255, 255, 255], v);
      } else {
        pixels[i] = scale(rgb, v);
      }
    }
  }
  return pixels;
};
