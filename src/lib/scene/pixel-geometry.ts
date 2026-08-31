import type { Fixture } from "@/lib/fixtures/types";
import { propSize } from "@/lib/fixtures/prop-sizes";
import { coroShapeFor, coroFrame, coroPixelPoints, starFrameFor } from "@/lib/fixtures/coro-shapes";
import type { LightPoint } from "./types";

/**
 * Expand a fixture into one LightPoint per pixel, in stage space (720×420).
 *
 * Pixel ordering MUST match what the effect renderers assume
 * (src/lib/render/effects/index.ts):
 * - mega-tree with strandCount: index = strand * pixelsPerStrand + p, p=0 at apex
 * - matrix: row-major for horizontal wiring, column-major for vertical
 * - everything else: linear along the run
 */
export function expandFixturePixels(fixture: Fixture, allFixtures?: Fixture[]): LightPoint[] {
  const n = fixture.pixelCount;
  if (n <= 0) return [];

  const pts = fixture.layout?.points ?? [];
  const size = propSize(fixture.kind);
  const cx = pts[0]?.x ?? size.cx;
  const cy = pts[0]?.y ?? size.cy;
  const { w, h } = size;

  // Exact coro-prop geometry wins over everything: shape AND wiring order
  // (chases must climb trees in rows, travel over arches, etc.)
  const coro = coroShapeFor(fixture);
  if (coro) {
    // a star rides on its paired tree's tip (one physical prop, two circuits)
    const frame = coro === "star5" ? starFrameFor(fixture, allFixtures) : coroFrame(coro, fixture);
    return coroPixelPoints(coro, n, frame).map((p, i) =>
      point(fixture, i, p.x, p.y, coro === "stake" ? 1.8 : 1.9)
    );
  }

  // Multi-point layouts are drawn runs (rooflines traced on the photo, etc.)
  // — distribute pixels along the polyline regardless of kind.
  if (pts.length >= 2) {
    return polyline(fixture, pts, fixture.layout?.closed ?? false);
  }

  switch (fixture.kind) {
    case "roofline":
      return line(fixture, cx - w / 2, cy, cx + w / 2, cy, 2.2);

    case "window-outline":
      return rectPerimeter(fixture, cx, cy, w, h, 1.7);

    case "arch":
      return quadBezier(
        fixture,
        { x: cx - w / 2, y: cy + h / 2 },
        { x: cx, y: cy - h / 2 },
        { x: cx + w / 2, y: cy + h / 2 },
        2.0
      );

    case "bush":
      return scatterEllipse(fixture, cx, cy, w / 2, h / 2, 1.8);

    case "mega-tree":
      return treeStrands(fixture, cx, cy, w, h, fixture.geometry?.strandCount ?? 12, 1.5);

    case "mini-tree":
      return treeStrands(fixture, cx, cy, w, h, fixture.geometry?.strandCount ?? 6, 1.5);

    case "matrix":
      return matrixGrid(fixture, cx, cy, w, h, 1.4);

    default:
      return scatterEllipse(fixture, cx, cy, 20, 20, 1.8);
  }
}

export function expandAllFixtures(fixtures: Fixture[]): LightPoint[] {
  return fixtures.flatMap((f) => expandFixturePixels(f, fixtures));
}

// ── shapes ──────────────────────────────────────────────────

function point(f: Fixture, i: number, x: number, y: number, size: number): LightPoint {
  return { fixtureId: f.id, pixelIndex: i, x, y, size };
}

function line(f: Fixture, x1: number, y1: number, x2: number, y2: number, size: number): LightPoint[] {
  const n = f.pixelCount;
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return point(f, i, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, size);
  });
}

function polyline(
  f: Fixture,
  pts: Array<{ x: number; y: number }>,
  closed: boolean,
  size = 2.2
): LightPoint[] {
  const verts = closed ? [...pts, pts[0]] : pts;
  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < verts.length - 1; i++) {
    const len = Math.hypot(verts[i + 1].x - verts[i].x, verts[i + 1].y - verts[i].y);
    segLens.push(len);
    total += len;
  }
  if (total === 0) return scatterEllipse(f, pts[0].x, pts[0].y, 10, 10, size);

  const n = f.pixelCount;
  const out: LightPoint[] = [];
  for (let i = 0; i < n; i++) {
    const target = (n === 1 ? 0.5 : i / (n - (closed ? 0 : 1))) * total;
    let acc = 0;
    let seg = 0;
    while (seg < segLens.length - 1 && acc + segLens[seg] < target) {
      acc += segLens[seg];
      seg++;
    }
    const local = segLens[seg] === 0 ? 0 : (target - acc) / segLens[seg];
    const a = verts[seg];
    const b = verts[seg + 1];
    out.push(point(f, i, a.x + (b.x - a.x) * local, a.y + (b.y - a.y) * local, size));
  }
  return out;
}

function rectPerimeter(f: Fixture, cx: number, cy: number, w: number, h: number, size: number): LightPoint[] {
  const x = cx - w / 2;
  const y = cy - h / 2;
  return polyline(
    f,
    [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
    true,
    size
  );
}

function quadBezier(
  f: Fixture,
  p0: { x: number; y: number },
  c: { x: number; y: number },
  p1: { x: number; y: number },
  size: number
): LightPoint[] {
  const n = f.pixelCount;
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const mt = 1 - t;
    const x = mt * mt * p0.x + 2 * mt * t * c.x + t * t * p1.x;
    const y = mt * mt * p0.y + 2 * mt * t * c.y + t * t * p1.y;
    return point(f, i, x, y, size);
  });
}

// Deterministic scatter (net-style wrap) inside an ellipse.
function scatterEllipse(f: Fixture, cx: number, cy: number, rx: number, ry: number, size: number): LightPoint[] {
  const n = f.pixelCount;
  return Array.from({ length: n }, (_, i) => {
    // Golden-angle spiral gives even, organic coverage without RNG.
    const t = (i + 0.5) / n;
    const r = Math.sqrt(t);
    const theta = i * 2.39996323;
    return point(f, i, cx + Math.cos(theta) * r * rx, cy + Math.sin(theta) * r * ry, size);
  });
}

/**
 * Cone of vertical strands: strand s runs apex → base, matching the
 * mega-tree effect logic (index = s * pixelsPerStrand + p).
 */
function treeStrands(
  f: Fixture,
  cx: number,
  cy: number,
  w: number,
  h: number,
  strandCount: number,
  size: number
): LightPoint[] {
  const n = f.pixelCount;
  const strands = Math.max(1, strandCount);
  const pixelsPerStrand = Math.max(1, Math.floor(n / strands));
  const apex = { x: cx, y: cy - h / 2 };
  const baseY = cy + h * 0.35;
  const out: LightPoint[] = [];
  for (let i = 0; i < n; i++) {
    const s = Math.min(strands - 1, Math.floor(i / pixelsPerStrand));
    const p = i - s * pixelsPerStrand;
    // Spread strand bases across the cone footprint; fold the visual angle so
    // "back" strands sit slightly inset, hinting at roundness.
    const frac = strands === 1 ? 0.5 : s / (strands - 1);
    const baseX = cx - w / 2 + frac * w;
    const t = pixelsPerStrand === 1 ? 1 : p / (pixelsPerStrand - 1);
    out.push(point(f, i, apex.x + (baseX - apex.x) * t, apex.y + (baseY - apex.y) * t, size));
  }
  return out;
}

function matrixGrid(f: Fixture, cx: number, cy: number, w: number, h: number, size: number): LightPoint[] {
  const n = f.pixelCount;
  const geo = f.geometry;
  const cols = geo?.cols ?? Math.max(1, Math.round(Math.sqrt(n * (w / h))));
  const rows = geo?.rows ?? Math.max(1, Math.ceil(n / cols));
  const out: LightPoint[] = [];
  for (let i = 0; i < n; i++) {
    // Effects index matrices row-major (idx = row * cols + col) for both
    // wiring directions — see the matrix branch in effects/index.ts.
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = cx - w / 2 + ((col + 0.5) / cols) * w;
    const y = cy - h / 2 + ((row + 0.5) / rows) * h;
    out.push(point(f, i, x, y, size));
  }
  return out;
}
