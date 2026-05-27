import type { EffectFn } from "./types";
import { ease, hexToRgb, scale } from "./utils";

export const fade: EffectFn = ({ block, fixture, t }) => {
  const { color1, intensity, easing = "linear" } = block.params;
  const rgb = hexToRgb(color1);
  const n = fixture.pixelCount;
  const progress = Math.min(1, (t - block.start) / block.duration);
  // Fade in first half, fade out second half
  const envelope = progress < 0.5
    ? ease(progress * 2, easing)
    : ease((1 - progress) * 2, easing);
  const brightness = envelope * intensity;
  const pixel = scale(rgb, brightness);
  return Array.from({ length: n }, () => pixel);
};
