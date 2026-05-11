import type { EffectFn, EffectInput, RGB } from "./types";
import type { EffectId } from "@/lib/timeline/types";

// Utility: parse hex to RGB
function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) || 0,
    parseInt(h.substring(2, 4), 16) || 0,
    parseInt(h.substring(4, 6), 16) || 0,
  ];
}

// Utility: lerp between two RGB values
function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Utility: scale brightness
function scale(rgb: RGB, s: number): RGB {
  return [
    Math.min(255, Math.round(rgb[0] * s)),
    Math.min(255, Math.round(rgb[1] * s)),
    Math.min(255, Math.round(rgb[2] * s)),
  ];
}

// Utility: deterministic pseudo-random from seed
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// Easing functions
function ease(t: number, easing: string): number {
  switch (easing) {
    case "ease-in": return t * t;
    case "ease-out": return t * (2 - t);
    case "ease-in-out": return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default: return t; // linear
  }
}

// ─── Effect implementations ─────────────────────────────────

const twinkle: EffectFn = ({ block, fixture, t }) => {
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

const chase: EffectFn = ({ block, fixture, t }) => {
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

const fade: EffectFn = ({ block, fixture, t }) => {
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

const strobe: EffectFn = ({ block, fixture, t }) => {
  const { color1, intensity, speed } = block.params;
  const rgb = hexToRgb(color1);
  const n = fixture.pixelCount;
  const freq = speed * 8; // Hz
  const on = Math.floor(t * freq) % 2 === 0;
  const pixel: RGB = on ? scale(rgb, intensity) : [0, 0, 0];
  return Array.from({ length: n }, () => pixel);
};

const sparkle: EffectFn = ({ block, fixture, t }) => {
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

const wave: EffectFn = ({ block, fixture, t }) => {
  const { color1, color2, intensity, speed } = block.params;
  const rgb1 = hexToRgb(color1);
  const rgb2 = color2 ? hexToRgb(color2) : rgb1;
  const n = fixture.pixelCount;
  const localT = (t - block.start) * speed;
  const geo = fixture.geometry;

  // Mega-tree: wave across strands
  if (fixture.kind === "mega-tree" && geo?.strandCount && geo.strandCount > 1) {
    const strandCount = geo.strandCount;
    const pixelsPerStrand = Math.floor(n / strandCount);
    const pixels: RGB[] = Array.from({ length: n }, () => [0, 0, 0] as RGB);
    for (let s = 0; s < strandCount; s++) {
      const phase = (s / strandCount) * Math.PI * 2 + localT * Math.PI * 2;
      const v = (Math.sin(phase) + 1) / 2;
      const rgb = color2 ? lerpRgb(rgb1, rgb2, v) : rgb1;
      const px = scale(rgb, v * intensity);
      for (let p = 0; p < pixelsPerStrand; p++) {
        const idx = s * pixelsPerStrand + p;
        if (idx < n) pixels[idx] = px;
      }
    }
    return pixels;
  }

  // Default: pixel-linear wave
  return Array.from({ length: n }, (_, i) => {
    const phase = (i / n) * Math.PI * 2 + localT * Math.PI * 2;
    const v = (Math.sin(phase) + 1) / 2;
    const rgb = color2 ? lerpRgb(rgb1, rgb2, v) : rgb1;
    return scale(rgb, v * intensity);
  });
};

const pulse: EffectFn = ({ block, fixture, t, beats }) => {
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

const wash: EffectFn = ({ block, fixture, t: _t }) => {
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

const meteor: EffectFn = ({ block, fixture, t }) => {
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

const firework: EffectFn = ({ block, fixture, t }) => {
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

// ─── Registry ───────────────────────────────────────────────

export const EFFECT_REGISTRY: Record<EffectId, EffectFn> = {
  twinkle,
  chase,
  fade,
  strobe,
  sparkle,
  wave,
  pulse,
  wash,
  meteor,
  firework,
};

export type { EffectFn, EffectInput, RGB };
