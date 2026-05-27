/**
 * Coordinate bridge — converts LightCanvas world coordinates into the
 * coordinate systems expected by xLights and LOR exports.
 *
 * World convention (matches house-templates.ts):
 *   - Origin (0, 0, 0) sits at the front-center of the house footprint on the ground.
 *   - X+ runs to the right along the front wall.
 *   - Z+ runs back into the scene (away from the viewer).
 *   - Y+ is up.
 *
 * Bounding box used for normalization:
 *   - X: [-template.width/2 - 2, template.width/2 + 2]   (extends 2m on each side)
 *   - Y: [0, template.wallHeight + roofHeight + 2]      (extends 2m above the roof peak)
 *   - Z: [-2, template.depth + 2]                       (extends 2m in front and behind)
 *
 *   roofHeight = template.width / 2 * template.roofPitch
 */

import type { HouseTemplate3D, LORCoord, Vec3, XLightsCoord } from "@/lib/3d/types";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

function getBoundingBox(template: HouseTemplate3D): BoundingBox {
  const roofHeight = (template.width / 2) * template.roofPitch;
  return {
    minX: -template.width / 2 - 2,
    maxX: template.width / 2 + 2,
    minY: 0,
    maxY: template.wallHeight + roofHeight + 2,
    minZ: -2,
    maxZ: template.depth + 2,
  };
}

/**
 * World coords → xLights normalized 0..100 percentage box around the house.
 * Each axis is clamped to [0, 100].
 */
export function worldToXLightsCoord(point: Vec3, template: HouseTemplate3D): XLightsCoord {
  const bb = getBoundingBox(template);
  const nx = ((point.x - bb.minX) / (bb.maxX - bb.minX)) * 100;
  const ny = ((point.y - bb.minY) / (bb.maxY - bb.minY)) * 100;
  const nz = ((point.z - bb.minZ) / (bb.maxZ - bb.minZ)) * 100;
  return {
    x: clamp(nx, 0, 100),
    y: clamp(ny, 0, 100),
    z: clamp(nz, 0, 100),
  };
}

/**
 * World coords → LOR centimeters from house origin.
 * Origin matches the world origin (front-center on the ground), so this is
 * just a scale from meters to centimeters.
 */
export function worldToLORCoord(point: Vec3, _template: HouseTemplate3D): LORCoord {
  return {
    x: point.x * 100,
    y: point.y * 100,
    z: point.z * 100,
  };
}

/**
 * World coords → normalized 2D 0..1 top-down projection. X maps over the
 * bounding box width, Z over the bounding box depth.
 */
export function worldToNormalized2D(
  point: Vec3,
  template: HouseTemplate3D,
): { x: number; y: number } {
  const bb = getBoundingBox(template);
  const nx = (point.x - bb.minX) / (bb.maxX - bb.minX);
  const ny = (point.z - bb.minZ) / (bb.maxZ - bb.minZ);
  return {
    x: clamp(nx, 0, 1),
    y: clamp(ny, 0, 1),
  };
}
