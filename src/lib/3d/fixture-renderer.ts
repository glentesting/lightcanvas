/**
 * Pure helpers used by the 3D scene's fixture renderers.
 *
 * NOTE: This module is intentionally minimal. Real effect rendering (proper
 * easing curves, multi-color blends, audio reactivity, etc.) lives in
 * `src/lib/render/`. The helpers here exist only so the 3D preview can show a
 * plausible live-color hint without round-tripping through the full render
 * pipeline.
 */

import type { Fixture3DLayout, Vec3 } from "@/lib/3d/types";
import { vec3Distance, vec3Lerp } from "@/lib/3d/types";

/** Dim warm-white pixel color used when no effect is playing. (RGB in 0..1) */
export const DEFAULT_PIXEL_COLOR: [number, number, number] = [0.18, 0.15, 0.1];

/**
 * Sample `pixelCount` points at uniform arc-length intervals along the
 * polyline defined by `layout.points`. If `layout.closed` is true, the path
 * is treated as a loop (last segment wraps back to point 0). If `pixelCount`
 * is 0 the result is empty. If the layout has 0 or 1 points the helper
 * returns `pixelCount` copies of the available point (or world-origin if
 * there are none).
 */
export function interpolateStrandPoints(
  layout: Fixture3DLayout,
  pixelCount: number,
): Vec3[] {
  if (pixelCount <= 0) return [];

  const pts = layout.points;
  if (pts.length === 0) {
    const zero: Vec3 = { x: 0, y: 0, z: 0 };
    return new Array(pixelCount).fill(0).map(() => ({ ...zero }));
  }
  if (pts.length === 1) {
    const only = pts[0];
    return new Array(pixelCount).fill(0).map(() => ({ ...only }));
  }

  // Build segment list (with optional closing segment).
  const segCount = layout.closed ? pts.length : pts.length - 1;
  const segLengths: number[] = new Array(segCount);
  let total = 0;
  for (let i = 0; i < segCount; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const len = vec3Distance(a, b);
    segLengths[i] = len;
    total += len;
  }

  // Degenerate (all points coincident).
  if (total === 0) {
    const only = pts[0];
    return new Array(pixelCount).fill(0).map(() => ({ ...only }));
  }

  // Closed paths distribute evenly around the loop (no duplicate at the seam).
  // Open paths place the first sample at the start and the last at the end.
  const out: Vec3[] = new Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const t = layout.closed
      ? (i / pixelCount) * total
      : pixelCount === 1
        ? 0
        : (i / (pixelCount - 1)) * total;

    // Walk segments to find which one this distance falls into.
    let remaining = t;
    let segIdx = 0;
    while (segIdx < segCount - 1 && remaining > segLengths[segIdx]) {
      remaining -= segLengths[segIdx];
      segIdx++;
    }
    const segLen = segLengths[segIdx] || 1; // guard divide-by-zero
    const localT = Math.min(1, Math.max(0, remaining / segLen));
    const a = pts[segIdx];
    const b = pts[(segIdx + 1) % pts.length];
    out[i] = vec3Lerp(a, b, localT);
  }

  return out;
}

/**
 * Minimal RGB parser. Accepts `#rgb`, `#rrggbb`, or returns null otherwise.
 * Result components are 0..1.
 */
function parseHexColor(hex: string): [number, number, number] | null {
  if (typeof hex !== "string") return null;
  let s = hex.trim();
  if (s.startsWith("#")) s = s.slice(1);
  if (s.length === 3) {
    s = s
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (s.length !== 6) return null;
  const n = parseInt(s, 16);
  if (Number.isNaN(n)) return null;
  return [
    ((n >> 16) & 0xff) / 255,
    ((n >> 8) & 0xff) / 255,
    (n & 0xff) / 255,
  ];
}

/**
 * Resolve a pixel color at time `t` (seconds, absolute) for a given fixture
 * pixel. Returns RGB in 0..1.
 *
 * The `effect` argument is intentionally loose — this helper only consumes a
 * handful of optional fields so the caller can pass a thinned-down
 * `EffectBlock` projection without coupling the 3D scene to the full
 * timeline types.
 *
 * Current behavior:
 *  - null effect      → DEFAULT_PIXEL_COLOR
 *  - effect.color set → that color (parsed hex)
 *  - effect.effect === "chase" → traveling warm pulse along pixel index
 *  - anything else    → DEFAULT_PIXEL_COLOR
 */
export function getFixtureColor(
  effect:
    | {
        id?: string;
        effect?: string;
        color?: string;
        startSec?: number;
        endSec?: number;
      }
    | null,
  t: number,
  pixelIndex: number,
  pixelCount: number,
): [number, number, number] {
  if (!effect) return DEFAULT_PIXEL_COLOR;

  const base = effect.color ? parseHexColor(effect.color) : null;

  if (effect.effect === "chase") {
    // Travel a soft pulse along the strand at 1 pass per 2 seconds.
    const n = Math.max(1, pixelCount);
    const head = (t * 0.5) % 1;
    const pos = pixelIndex / n;
    const dist = Math.min(
      Math.abs(pos - head),
      Math.abs(pos - head - 1),
      Math.abs(pos - head + 1),
    );
    const falloff = Math.max(0, 1 - dist * 6); // narrow pulse
    const tint = base ?? [1.0, 0.78, 0.42];
    return [
      tint[0] * falloff + DEFAULT_PIXEL_COLOR[0] * (1 - falloff),
      tint[1] * falloff + DEFAULT_PIXEL_COLOR[1] * (1 - falloff),
      tint[2] * falloff + DEFAULT_PIXEL_COLOR[2] * (1 - falloff),
    ];
  }

  if (base) return base;

  return DEFAULT_PIXEL_COLOR;
}
