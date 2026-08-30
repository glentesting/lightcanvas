/**
 * Exact geometry for the owner's flat coroplast props, verified against
 * manufacturer photos — NOT inferred from LOR Parm values, and not cones.
 *
 *  - Mini tree (80 px): flat tiered silhouette; pixels in ~10 horizontal
 *    rows, fewest at the top, most at the bottom; wired bottom row first,
 *    serpentine, so a chase climbs the tree in bands.
 *  - Mini tree star (20 px): 5-point star outline above the tree.
 *  - Arch (25 px): semicircle, pixels along the outer edge, ordered from
 *    one leg over the top to the other, so a chase travels over the arch.
 *  - Pixel stake (5 px): 5 pixels stacked vertically in the upper portion
 *    of a stick; the ground spike below carries no pixels.
 *
 * The same generators feed the preview light points (pixel ORDER here is
 * what makes chases read correctly) and the layout editor's outlines.
 */

import type { Fixture } from "./types";

export type CoroShape = "tiered-tree" | "star5" | "arch" | "stake";

export interface CoroFrame {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

const DEFAULT_SIZES: Record<CoroShape, { w: number; h: number }> = {
  "tiered-tree": { w: 38, h: 46 },
  star5: { w: 16, h: 16 },
  arch: { w: 46, h: 22 },
  stake: { w: 6, h: 16 },
};

/** Which coro shape a fixture is — explicit geometry hint, or inferred from
 *  the LOR prop it was imported from. */
export function coroShapeFor(fixture: Fixture): CoroShape | null {
  const hinted = fixture.geometry?.coroShape;
  if (hinted) return hinted;
  const name = fixture.lor?.propName ?? "";
  if (/^RGB Mini Tree Base/.test(name)) return "tiered-tree";
  if (/^RGB Mini Tree Star/.test(name)) return "star5";
  if (/^RGB Arch/.test(name)) return "arch";
  if (/^RGB Pixel Stake/.test(name)) return "stake";
  return null;
}

/** Placement frame from the fixture's layout (bounds of its points), with
 *  shape-appropriate minimum sizes. */
export function coroFrame(shape: CoroShape, fixture: Fixture): CoroFrame {
  const dflt = DEFAULT_SIZES[shape];
  const pts = fixture.layout?.points ?? [];
  if (pts.length === 0) return { cx: 360, cy: 210, w: dflt.w, h: dflt.h };
  if (pts.length === 1) return { cx: pts[0].x, cy: pts[0].y, w: dflt.w, h: dflt.h };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    w: Math.max(dflt.w * 0.6, maxX - minX),
    h: Math.max(dflt.h * 0.6, maxY - minY),
  };
}

/** Ordered pixel positions for a coro shape. */
export function coroPixelPoints(shape: CoroShape, n: number, f: CoroFrame): Array<{ x: number; y: number }> {
  switch (shape) {
    case "tiered-tree": return tieredTreePoints(n, f);
    case "star5": return alongPath(starOutline(f), n, true);
    case "arch": return archPoints(n, f);
    case "stake": return stakePoints(n, f);
  }
}

/** SVG path for the shape's silhouette (layout editor day view). */
export function coroOutlinePath(shape: CoroShape, f: CoroFrame): string {
  switch (shape) {
    case "tiered-tree": return treeSilhouette(f);
    case "star5": return closedPath(starOutline(f));
    case "arch": {
      const baseY = f.cy + f.h / 2;
      const rx = f.w / 2;
      return `M ${f.cx - rx} ${baseY} A ${rx} ${f.h} 0 0 1 ${f.cx + rx} ${baseY}`;
    }
    case "stake": {
      // stick with a ground spike
      const top = f.cy - f.h / 2;
      const base = f.cy + f.h * 0.25;
      const tip = f.cy + f.h / 2 + 4;
      const hw = Math.max(2, f.w / 2);
      return (
        `M ${f.cx - hw} ${top} H ${f.cx + hw} V ${base} L ${f.cx} ${tip} L ${f.cx - hw} ${base} Z`
      );
    }
  }
}

/* ── tiered tree ──────────────────────────────────────────── */

/** Row pixel counts, top→bottom: linear taper (fewest on top), scaled to n. */
export function treeRowCounts(n: number): number[] {
  const rows = n >= 60 ? 10 : Math.max(3, Math.round(n / 8));
  const weights = Array.from({ length: rows }, (_, i) => 3 + (9 * i) / (rows - 1)); // 3 → 12
  const total = weights.reduce((s, v) => s + v, 0);
  const exact = weights.map((v) => (v / total) * n);
  const counts = exact.map(Math.floor);
  let remaining = n - counts.reduce((s, v) => s + v, 0);
  // largest remainder, biased toward the bottom rows
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || b.i - a.i);
  for (const { i } of order) {
    if (remaining <= 0) break;
    counts[i]++;
    remaining--;
  }
  return counts.map((c) => Math.max(2, c));
}

function tieredTreePoints(n: number, f: CoroFrame): Array<{ x: number; y: number }> {
  const counts = treeRowCounts(n); // top → bottom
  const rows = counts.length;
  const maxCount = Math.max(...counts);
  const out: Array<{ x: number; y: number }> = [];
  // wiring starts at the BOTTOM row and serpentines upward
  for (let r = rows - 1; r >= 0; r--) {
    const count = counts[r];
    const y = f.cy - f.h / 2 + ((r + 0.5) / rows) * f.h;
    const rowW = (count / maxCount) * f.w;
    const leftToRight = (rows - 1 - r) % 2 === 0;
    for (let k = 0; k < count; k++) {
      const t = count === 1 ? 0.5 : k / (count - 1);
      const tt = leftToRight ? t : 1 - t;
      out.push({ x: f.cx - rowW / 2 + tt * rowW, y });
    }
  }
  return out.slice(0, n);
}

function treeSilhouette(f: CoroFrame): string {
  // three-tier flat tree silhouette with a stubby trunk
  const x = (t: number) => f.cx + t * (f.w / 2);
  const y = (t: number) => f.cy - f.h / 2 + t * f.h;
  return [
    `M ${x(0)} ${y(0)}`,
    `L ${x(0.45)} ${y(0.3)} L ${x(0.25)} ${y(0.3)}`,
    `L ${x(0.7)} ${y(0.62)} L ${x(0.45)} ${y(0.62)}`,
    `L ${x(1)} ${y(0.92)} L ${x(0.12)} ${y(0.92)} L ${x(0.12)} ${y(1)}`,
    `L ${x(-0.12)} ${y(1)} L ${x(-0.12)} ${y(0.92)} L ${x(-1)} ${y(0.92)}`,
    `L ${x(-0.45)} ${y(0.62)} L ${x(-0.7)} ${y(0.62)}`,
    `L ${x(-0.25)} ${y(0.3)} L ${x(-0.45)} ${y(0.3)} Z`,
  ].join(" ");
}

/* ── star ─────────────────────────────────────────────────── */

function starOutline(f: CoroFrame): Array<{ x: number; y: number }> {
  const R = Math.min(f.w, f.h) / 2;
  const r = R * 0.45;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? R : r;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5; // start at the top point
    pts.push({ x: f.cx + radius * Math.cos(angle), y: f.cy + radius * Math.sin(angle) });
  }
  return pts;
}

/* ── arch ─────────────────────────────────────────────────── */

function archPoints(n: number, f: CoroFrame): Array<{ x: number; y: number }> {
  const baseY = f.cy + f.h / 2;
  const rx = f.w / 2;
  const ry = f.h;
  return Array.from({ length: n }, (_, i) => {
    // left leg (θ=π) over the top (θ=π/2) down to the right leg (θ=0)
    const theta = Math.PI - (i / (n - 1)) * Math.PI;
    return { x: f.cx + rx * Math.cos(theta), y: baseY - ry * Math.sin(theta) };
  });
}

/* ── stake ────────────────────────────────────────────────── */

function stakePoints(n: number, f: CoroFrame): Array<{ x: number; y: number }> {
  // pixels stacked in the upper portion; spike below stays dark
  const top = f.cy - f.h / 2 + 1;
  const span = f.h * 0.55;
  return Array.from({ length: n }, (_, i) => ({
    x: f.cx,
    y: top + (n === 1 ? 0.5 : i / (n - 1)) * span,
  }));
}

/* ── shared helpers ───────────────────────────────────────── */

function closedPath(pts: Array<{ x: number; y: number }>): string {
  return `M ${pts.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;
}

/** Distribute n points evenly along an open polyline (bulk row placement). */
export function distributeAlongPath(
  verts: Array<{ x: number; y: number }>,
  n: number
): Array<{ x: number; y: number }> {
  if (verts.length < 2) return Array.from({ length: n }, () => ({ ...verts[0] }));
  return alongPath(verts, n, false);
}

/** Distribute n points evenly along a (possibly closed) polyline. */
function alongPath(
  verts: Array<{ x: number; y: number }>,
  n: number,
  closed: boolean
): Array<{ x: number; y: number }> {
  const path = closed ? [...verts, verts[0]] : verts;
  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const len = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
    segLens.push(len);
    total += len;
  }
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const target = (i / (closed ? n : Math.max(1, n - 1))) * total;
    let acc = 0;
    let seg = 0;
    while (seg < segLens.length - 1 && acc + segLens[seg] < target) {
      acc += segLens[seg];
      seg++;
    }
    const local = segLens[seg] === 0 ? 0 : (target - acc) / segLens[seg];
    const a = path[seg];
    const b = path[seg + 1];
    out.push({ x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local });
  }
  return out;
}
