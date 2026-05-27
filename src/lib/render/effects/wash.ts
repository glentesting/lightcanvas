import type { EffectFn } from "./types";
import { hexToRgb, lerpRgb, scale } from "./utils";

export const wash: EffectFn = ({ block, fixture, t: _t }) => {
  const { color1, color2, intensity } = block.params;
  const rgb1 = hexToRgb(color1);
  const rgb2 = color2 ? hexToRgb(color2) : rgb1;
  const n = fixture.pixelCount;
  return Array.from({ length: n }, (_, i) => {
    const mix = i / Math.max(1, n - 1);
    const rgb = lerpRgb(rgb1, rgb2, mix);
    return scale(rgb, intensity);
  });
};
