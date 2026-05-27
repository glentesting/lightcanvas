import type { RGB } from "./types";

// Utility: parse hex to RGB
export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) || 0,
    parseInt(h.substring(2, 4), 16) || 0,
    parseInt(h.substring(4, 6), 16) || 0,
  ];
}

// Utility: lerp between two RGB values
export function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Utility: scale brightness
export function scale(rgb: RGB, s: number): RGB {
  return [
    Math.min(255, Math.round(rgb[0] * s)),
    Math.min(255, Math.round(rgb[1] * s)),
    Math.min(255, Math.round(rgb[2] * s)),
  ];
}

// Utility: deterministic pseudo-random from seed
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// Easing functions
export function ease(t: number, easing: string): number {
  switch (easing) {
    case "ease-in": return t * t;
    case "ease-out": return t * (2 - t);
    case "ease-in-out": return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default: return t; // linear
  }
}
