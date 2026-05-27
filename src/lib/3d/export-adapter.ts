/**
 * Export adapter — turns a fixture's 3D layout into per-pixel coordinates
 * ready for xLights and LOR export, plus pre-flight validation.
 *
 * Pure module — no React, no THREE.
 */

import type { Fixture } from "@/lib/fixtures/types";
import type { Fixture3DLayout, HouseTemplate3D, Vec3 } from "@/lib/3d/types";
import { vec3Distance, vec3Lerp } from "@/lib/3d/types";
import { worldToLORCoord, worldToXLightsCoord } from "@/lib/3d/coordinate-bridge";

export interface FixtureExportData {
  fixtureId: string;
  name: string;
  kind: Fixture["kind"];
  pixelCount: number;
  startChannel: number;
  universe: number;
  /** Per-pixel xLights coords (normalized 0..100) */
  xlightsPoints: { x: number; y: number; z: number }[];
  /** Per-pixel LOR coords (cm from origin) */
  lorPoints: { x: number; y: number; z: number }[];
}

export interface ExportWarning {
  fixtureId: string;
  message: string;
  severity: "info" | "warn" | "error";
}

/**
 * Interpolate `count` points evenly along the polyline defined by `path`,
 * using arc-length parametrization. For a closed path the last segment
 * wraps from path[n-1] → path[0].
 *
 * If count is 1, returns the path midpoint (or the single point).
 * If the path has < 2 points, returns `count` copies of path[0] (or [0,0,0]).
 */
function interpolateAlongPath(path: Vec3[], count: number, closed: boolean): Vec3[] {
  if (count <= 0) return [];
  if (path.length === 0) {
    return Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0 }));
  }
  if (path.length === 1) {
    return Array.from({ length: count }, () => ({ ...path[0] }));
  }

  // Build segment list including wrap if closed.
  const segments: { from: Vec3; to: Vec3; len: number }[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    segments.push({ from, to, len: vec3Distance(from, to) });
  }
  if (closed && path.length >= 2) {
    const from = path[path.length - 1];
    const to = path[0];
    segments.push({ from, to, len: vec3Distance(from, to) });
  }

  const totalLen = segments.reduce((s, seg) => s + seg.len, 0);

  if (totalLen === 0) {
    return Array.from({ length: count }, () => ({ ...path[0] }));
  }

  if (count === 1) {
    // Sample the midpoint.
    return [sampleAtDistance(segments, totalLen / 2)];
  }

  const out: Vec3[] = [];
  // For closed paths sample [0, totalLen) at evenly spaced positions so the
  // ends don't duplicate. For open paths sample [0, totalLen] inclusive.
  const denominator = closed ? count : count - 1;
  for (let i = 0; i < count; i++) {
    const target = denominator === 0 ? 0 : (i * totalLen) / denominator;
    out.push(sampleAtDistance(segments, target));
  }
  return out;
}

function sampleAtDistance(
  segments: { from: Vec3; to: Vec3; len: number }[],
  distance: number,
): Vec3 {
  let remaining = Math.max(0, distance);
  for (const seg of segments) {
    if (seg.len === 0) continue;
    if (remaining <= seg.len) {
      const t = remaining / seg.len;
      return vec3Lerp(seg.from, seg.to, t);
    }
    remaining -= seg.len;
  }
  // Overshot — return the very last endpoint.
  const last = segments[segments.length - 1];
  return last ? { ...last.to } : { x: 0, y: 0, z: 0 };
}

/**
 * Build the per-pixel export data for a fixture from its 3D layout.
 * Returns null if no layout has been placed for this fixture.
 */
export function getFixtureExportData(
  fixture: Fixture,
  layout: Fixture3DLayout | undefined,
  template: HouseTemplate3D,
): FixtureExportData | null {
  if (!layout) return null;

  const count = Math.max(0, fixture.pixelCount | 0);
  const samples = interpolateAlongPath(layout.points, count, layout.closed);

  const xlightsPoints = samples.map((p) => worldToXLightsCoord(p, template));
  const lorPoints = samples.map((p) => worldToLORCoord(p, template));

  return {
    fixtureId: fixture.id,
    name: fixture.name,
    kind: fixture.kind,
    pixelCount: count,
    startChannel: fixture.startChannel,
    universe: fixture.universe ?? 1,
    xlightsPoints,
    lorPoints,
  };
}

/**
 * Pre-flight validation across all fixtures.
 *
 *  - warn  : fixture has no 3D layout placed
 *  - warn  : fixture has an empty points array
 *  - error : startChannel ranges overlap within the same universe
 */
export function validateExport(
  fixtures: Fixture[],
  layouts: Record<string, Fixture3DLayout>,
): ExportWarning[] {
  const warnings: ExportWarning[] = [];

  for (const f of fixtures) {
    const layout = layouts[f.id];
    if (!layout) {
      warnings.push({
        fixtureId: f.id,
        message: `Fixture "${f.name}" has no 3D layout placed.`,
        severity: "warn",
      });
      continue;
    }
    if (!layout.points || layout.points.length === 0) {
      warnings.push({
        fixtureId: f.id,
        message: `Fixture "${f.name}" has an empty layout path.`,
        severity: "warn",
      });
    }
  }

  // Overlap detection — per-universe.
  interface Range {
    fixtureId: string;
    name: string;
    start: number;
    end: number; // inclusive
  }
  const byUniverse = new Map<number, Range[]>();
  for (const f of fixtures) {
    const pixels = Math.max(0, f.pixelCount | 0);
    if (pixels === 0) continue;
    const universe = f.universe ?? 1;
    const start = f.startChannel;
    const end = f.startChannel + pixels - 1;
    const list = byUniverse.get(universe) ?? [];
    list.push({ fixtureId: f.id, name: f.name, start, end });
    byUniverse.set(universe, list);
  }

  for (const [universe, ranges] of byUniverse) {
    ranges.sort((a, b) => a.start - b.start);
    for (let i = 1; i < ranges.length; i++) {
      const prev = ranges[i - 1];
      const cur = ranges[i];
      if (cur.start <= prev.end) {
        warnings.push({
          fixtureId: cur.fixtureId,
          message: `Channel overlap on universe ${universe}: "${cur.name}" (${cur.start}-${cur.end}) overlaps "${prev.name}" (${prev.start}-${prev.end}).`,
          severity: "error",
        });
      }
    }
  }

  return warnings;
}
