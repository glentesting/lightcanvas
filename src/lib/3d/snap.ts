/**
 * Snapping primitives for the 3D layout editor.
 *
 * Pure module — no React, no THREE.
 */

import type { AnchorSurface, SnapResult, Vec3 } from "@/lib/3d/types";
import { vec3Distance } from "@/lib/3d/types";

interface AnchorCandidate {
  surface: AnchorSurface;
  point: Vec3;
  distance: number;
}

/** Squared length of a Vec3 (treated as a vector). */
function lenSq(v: Vec3): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize(v: Vec3): Vec3 {
  const m = Math.sqrt(lenSq(v));
  if (m === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / m, y: v.y / m, z: v.z / m };
}

/** Closest point on a finite line segment a→b to point p. */
function closestPointOnSegment(p: Vec3, a: Vec3, b: Vec3): Vec3 {
  const ab = sub(b, a);
  const ab2 = lenSq(ab);
  if (ab2 === 0) return { ...a };
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / ab2));
  return add(a, scale(ab, t));
}

/** Closest point on the infinite plane defined by anchor.worldPosition + normal. */
function closestPointOnPlane(p: Vec3, origin: Vec3, normal: Vec3): Vec3 {
  const n = normalize(normal);
  const d = dot(sub(p, origin), n);
  return sub(p, scale(n, d));
}

/**
 * Find nearest anchor within radius. Returns a SnapResult with
 * source="anchor" if found, otherwise source="none" (and the input point unchanged).
 *
 * Per-anchor radius: the smaller of `surface.snapRadius` and the `radius` arg
 * is used as the effective threshold for that surface.
 */
export function snapToAnchor(
  point: Vec3,
  surfaces: AnchorSurface[],
  radius: number,
): SnapResult {
  let best: AnchorCandidate | null = null;

  for (const surface of surfaces) {
    let target: Vec3;
    if (surface.type === "edge" && surface.endPosition) {
      target = closestPointOnSegment(point, surface.worldPosition, surface.endPosition);
    } else if (surface.type === "face") {
      target = closestPointOnPlane(point, surface.worldPosition, surface.normal);
    } else {
      target = surface.worldPosition;
    }

    const d = vec3Distance(point, target);
    const effectiveRadius = Math.min(surface.snapRadius, radius);
    if (d > effectiveRadius) continue;

    if (!best || d < best.distance) {
      best = { surface, point: target, distance: d };
    }
  }

  if (!best) {
    return { snapped: false, point: { ...point }, source: "none" };
  }
  return {
    snapped: true,
    point: best.point,
    surfaceId: best.surface.id,
    source: "anchor",
  };
}

/**
 * Snap to the nearest grid cell on the Y=ground plane.
 * X and Z are rounded to the nearest `step`; Y is preserved.
 */
export function snapToGrid(point: Vec3, step: number): Vec3 {
  if (step <= 0) return { ...point };
  return {
    x: Math.round(point.x / step) * step,
    y: point.y,
    z: Math.round(point.z / step) * step,
  };
}

/**
 * Unified snap: anchor takes priority over grid.
 * If snap is disabled, returns the point unchanged with source="none".
 */
export function snapPoint(
  point: Vec3,
  surfaces: AnchorSurface[],
  gridStep: number,
  snapEnabled: boolean,
): SnapResult {
  if (!snapEnabled) {
    return { snapped: false, point: { ...point }, source: "none" };
  }

  const anchorHit = snapToAnchor(point, surfaces, Number.POSITIVE_INFINITY);
  if (anchorHit.snapped) return anchorHit;

  return {
    snapped: true,
    point: snapToGrid(point, gridStep),
    source: "grid",
  };
}
