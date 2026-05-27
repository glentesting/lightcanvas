import type { EffectFn, RGB } from "./types";
import { hexToRgb, scale } from "./utils";

export const chase: EffectFn = ({ block, fixture, t }) => {
  const { color1, intensity, speed, direction = "forward", trailLength = 8 } = block.params;
  const rgb = hexToRgb(color1);
  const n = fixture.pixelCount;
  const localT = (t - block.start) * speed;
  const geo = fixture.geometry;

  // Mega-tree: chase strand-by-strand
  if (fixture.kind === "mega-tree" && geo?.strandCount && geo.strandCount > 1) {
    const strandCount = geo.strandCount;
    const pixelsPerStrand = Math.floor(n / strandCount);
    const strandPhase = (localT * 2) % strandCount;
    const pixels: RGB[] = Array.from({ length: n }, () => [0, 0, 0] as RGB);
    for (let s = 0; s < strandCount; s++) {
      const brightness = Math.max(0, 1 - Math.abs(s - strandPhase) * 0.5) * intensity;
      for (let p = 0; p < pixelsPerStrand; p++) {
        const idx = s * pixelsPerStrand + p;
        if (idx < n) pixels[idx] = scale(rgb, brightness);
      }
    }
    return pixels;
  }

  // Matrix: chase across rows or columns
  if (fixture.kind === "matrix" && geo?.rows && geo?.cols) {
    const { rows, cols } = geo;
    const horizontal = geo.wiringDirection !== "vertical";
    const lineCount = horizontal ? rows : cols;
    const linePhase = (localT * 2) % lineCount;
    const pixels: RGB[] = Array.from({ length: n }, () => [0, 0, 0] as RGB);
    for (let line = 0; line < lineCount; line++) {
      const brightness = Math.max(0, 1 - Math.abs(line - linePhase) * 0.5) * intensity;
      const lineLen = horizontal ? cols : rows;
      for (let p = 0; p < lineLen; p++) {
        const idx = horizontal ? line * cols + p : p * cols + line;
        if (idx < n) pixels[idx] = scale(rgb, brightness);
      }
    }
    return pixels;
  }

  // Default: pixel-linear chase
  const headPos = (localT * n * 0.5) % n;
  return Array.from({ length: n }, (_, i) => {
    const idx = direction === "backward" ? n - 1 - i : i;
    let dist = (headPos - idx + n) % n;
    if (dist > n / 2) dist = n - dist;
    const brightness = dist < trailLength ? (1 - dist / trailLength) * intensity : 0;
    return scale(rgb, brightness);
  });
};
