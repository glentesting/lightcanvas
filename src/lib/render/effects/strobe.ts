import type { EffectFn, RGB } from "./types";
import { hexToRgb, scale } from "./utils";

export const strobe: EffectFn = ({ block, fixture, t }) => {
  const { color1, intensity, speed } = block.params;
  const rgb = hexToRgb(color1);
  const n = fixture.pixelCount;
  const freq = speed * 8; // Hz
  const on = Math.floor(t * freq) % 2 === 0;
  const pixel: RGB = on ? scale(rgb, intensity) : [0, 0, 0];
  return Array.from({ length: n }, () => pixel);
};
