import type { EffectFn } from "./types";
import { hexToRgb, scale } from "./utils";

export const pulse: EffectFn = ({ block, fixture, t, beats }) => {
  const { color1, intensity, speed } = block.params;
  const rgb = hexToRgb(color1);
  const n = fixture.pixelCount;
  // If beats available, pulse on beats; otherwise use speed
  let v: number;
  if (beats && beats.length > 0) {
    const nearestBeat = beats.reduce((best, b) => Math.abs(b - t) < Math.abs(best - t) ? b : best, beats[0]);
    const dist = Math.abs(t - nearestBeat);
    v = Math.max(0, 1 - dist * 4) * intensity;
  } else {
    v = ((Math.sin(t * speed * Math.PI * 2) + 1) / 2) * intensity;
  }
  const pixel = scale(rgb, v);
  return Array.from({ length: n }, () => pixel);
};
