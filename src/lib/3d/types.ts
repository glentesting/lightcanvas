/**
 * Shared 3D types for the LightCanvas layout system.
 *
 * Contract: store and serialized data use plain `Vec3` objects.
 * Renderers may convert to `THREE.Vector3` / `[x, y, z]` tuples
 * at the boundary. Never store THREE.Vector3 instances in the store.
 */

import type { ReactThreeFiber } from "@react-three/fiber";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Euler3 {
  x: number;
  y: number;
  z: number;
}

export type Tool3D = "select" | "pen" | "rect" | "circle";

export interface Scene3DConfig {
  gridSize: number;
  cellSize: number;
  cameraPosition: Vec3;
  cameraTarget: Vec3;
  ambientIntensity: number;
  directionalIntensity: number;
  fogNear: number;
  fogFar: number;
}

// ---------------------------------------------------------------------------
// House templates
// ---------------------------------------------------------------------------

export type WallSide = "front" | "back" | "left" | "right";

export interface WindowSpec {
  /** Horizontal offset along the wall (meters from wall origin) */
  x: number;
  /** Vertical offset (meters from ground) */
  y: number;
  width: number;
  height: number;
  wall: WallSide;
}

export interface DoorSpec {
  x: number;
  width: number;
  height: number;
  wall: WallSide;
}

export interface GarageSpec {
  width: number;
  depth: number;
  /** Offset along the front wall in meters */
  offsetX: number;
  height: number;
}

export interface BushRowSpec {
  /** Distance in front of front wall, meters */
  y: number;
  count: number;
  spacing: number;
}

export interface HouseTemplate3D {
  id: string;
  name: string;
  /** Footprint along x-axis (meters) */
  width: number;
  /** Footprint along z-axis (meters) */
  depth: number;
  /** Wall height to eaves (meters) */
  wallHeight: number;
  /** Roof pitch as rise/run ratio. 0 = flat roof. */
  roofPitch: number;
  garage: GarageSpec | null;
  windows: WindowSpec[];
  doors: DoorSpec[];
  bushRow: BushRowSpec | null;
}

// ---------------------------------------------------------------------------
// Anchor surfaces — the named snap targets on a house
// ---------------------------------------------------------------------------

export type AnchorType = "edge" | "face" | "point";

export interface AnchorSurface {
  id: string;
  name: string;
  type: AnchorType;
  /** World-space position. For edges, this is the start of the edge. */
  worldPosition: Vec3;
  /** Outward-facing surface normal */
  normal: Vec3;
  /** For edges, the end point in world space (otherwise omitted) */
  endPosition?: Vec3;
  /** Snap proximity in meters */
  snapRadius: number;
}

// ---------------------------------------------------------------------------
// 3D fixture layout — the per-fixture placement data
// ---------------------------------------------------------------------------

export interface Fixture3DLayout {
  /** Ordered path points in world space. For point fixtures: single point. */
  points: Vec3[];
  /** Closed path (e.g. rectangle outlining a window) */
  closed: boolean;
  /** Which named anchor this fixture is attached to, if any */
  anchorSurfaceId?: string;
  /** Optional per-fixture rotation override */
  rotation?: Euler3;
}

export interface PropPlacement3D {
  fixtureId: string;
  position: Vec3;
  rotation: Euler3;
}

// ---------------------------------------------------------------------------
// Raycast / snap results
// ---------------------------------------------------------------------------

export interface RaycastHit {
  /** Identifier of the hit object (anchor id, "ground", "house") */
  objectId: string;
  /** World-space hit point */
  point: Vec3;
  /** Surface normal at the hit point */
  normal: Vec3;
  /** The matched anchor if the ray hit one */
  anchorSurface?: AnchorSurface;
  /** Distance from ray origin */
  distance: number;
}

export interface SnapResult {
  snapped: boolean;
  point: Vec3;
  /** Snapped anchor id, if any */
  surfaceId?: string;
  /** "anchor" | "grid" | "none" — which strategy matched */
  source: "anchor" | "grid" | "none";
}

// ---------------------------------------------------------------------------
// Export-target coordinate types (used by lib/3d/coordinate-bridge.ts)
// ---------------------------------------------------------------------------

export interface XLightsCoord {
  /** Normalized 0..100 */
  x: number;
  y: number;
  z: number;
}

export interface LORCoord {
  /** Centimeters from house origin (front-center on ground) */
  x: number;
  y: number;
  z: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const vec3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
export const vec3Zero = (): Vec3 => ({ x: 0, y: 0, z: 0 });
export const vec3ToTuple = (v: Vec3): [number, number, number] => [v.x, v.y, v.z];
export const tupleToVec3 = (t: [number, number, number]): Vec3 => ({ x: t[0], y: t[1], z: t[2] });
export const vec3Distance = (a: Vec3, b: Vec3): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};
export const vec3Lerp = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});

// Re-export the R3F namespace for convenience in consumer components.
export type R3F = typeof ReactThreeFiber;
