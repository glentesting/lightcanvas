"use client";

/**
 * Named anchor surfaces on a house template. These are the snap targets
 * exposed to the snap module and the prop placement UI.
 *
 * Coordinate convention (matches house-templates.ts and HouseGeometry.tsx):
 *   - Origin (0, 0, 0) at front-center of the footprint on the ground.
 *   - Front wall sits on z = 0, back wall on z = depth.
 *   - Left wall at x = -width/2, right wall at x = +width/2.
 *   - Y is up.
 */

import { useMemo } from "react";
import { ANCHOR_SNAP_RADIUS } from "@/lib/3d/constants";
import type {
  AnchorSurface,
  DoorSpec,
  HouseTemplate3D,
  Vec3,
  WallSide,
  WindowSpec,
} from "@/lib/3d/types";

interface WallFrame {
  /** Outward-facing normal (unit) */
  outward: Vec3;
  /** Right-vector along the wall surface (left-to-right when looking at the face) */
  right: Vec3;
  /** Length of the wall */
  length: number;
  /** Center of the wall's footprint on the ground in world coords */
  centerGround: Vec3;
}

function buildFrames(t: HouseTemplate3D): Record<WallSide, WallFrame> {
  const halfW = t.width / 2;
  return {
    front: {
      outward: { x: 0, y: 0, z: -1 },
      right: { x: 1, y: 0, z: 0 },
      length: t.width,
      centerGround: { x: 0, y: 0, z: 0 },
    },
    back: {
      outward: { x: 0, y: 0, z: 1 },
      right: { x: -1, y: 0, z: 0 },
      length: t.width,
      centerGround: { x: 0, y: 0, z: t.depth },
    },
    left: {
      outward: { x: -1, y: 0, z: 0 },
      right: { x: 0, y: 0, z: 1 },
      length: t.depth,
      centerGround: { x: -halfW, y: 0, z: t.depth / 2 },
    },
    right: {
      outward: { x: 1, y: 0, z: 0 },
      right: { x: 0, y: 0, z: -1 },
      length: t.depth,
      centerGround: { x: halfW, y: 0, z: t.depth / 2 },
    },
  };
}

/** Convert a wall-local (xAlongWall from LEFT end, yFromGround) to world XYZ. */
function wallLocalToWorld(
  frame: WallFrame,
  xAlongWall: number,
  yFromGround: number,
  popOut = 0,
): Vec3 {
  const offset = xAlongWall - frame.length / 2;
  return {
    x: frame.centerGround.x + frame.right.x * offset + frame.outward.x * popOut,
    y: yFromGround,
    z: frame.centerGround.z + frame.right.z * offset + frame.outward.z * popOut,
  };
}

const UP: Vec3 = { x: 0, y: 1, z: 0 };

/** Pure compute — usable outside React. */
export function computeSurfaces(template: HouseTemplate3D): AnchorSurface[] {
  const surfaces: AnchorSurface[] = [];
  const halfW = template.width / 2;
  const h = template.wallHeight;
  const d = template.depth;
  const isPitched = template.roofPitch > 0;
  const ridgeHeight = isPitched ? h + halfW * template.roofPitch : h;
  const frames = buildFrames(template);

  // ----- Roofline (eaves) -----
  // Front eave: top of front wall, runs from left-front-top to right-front-top.
  surfaces.push({
    id: "roofline-front",
    name: "Front Roofline",
    type: "edge",
    worldPosition: { x: -halfW, y: h, z: 0 },
    endPosition: { x: halfW, y: h, z: 0 },
    normal: { x: 0, y: 1, z: 0 },
    snapRadius: ANCHOR_SNAP_RADIUS,
  });
  surfaces.push({
    id: "roofline-back",
    name: "Back Roofline",
    type: "edge",
    worldPosition: { x: -halfW, y: h, z: d },
    endPosition: { x: halfW, y: h, z: d },
    normal: { x: 0, y: 1, z: 0 },
    snapRadius: ANCHOR_SNAP_RADIUS,
  });

  // Peak ridge — only if pitched
  if (isPitched) {
    surfaces.push({
      id: "roofline-peak",
      name: "Roof Peak",
      type: "edge",
      worldPosition: { x: 0, y: ridgeHeight, z: 0 },
      endPosition: { x: 0, y: ridgeHeight, z: d },
      normal: { x: 0, y: 1, z: 0 },
      snapRadius: ANCHOR_SNAP_RADIUS,
    });
  }

  // ----- Gutter / front eave detail -----
  // For pitched roofs, gutter is essentially the same line as the roofline-front
  // but flagged as a distinct anchor (different visual + different default fixture).
  // For flat roofs, the eave sits at wallHeight (same as front roofline) — keep
  // the same world coord but expose under a different id so consumers can pick.
  surfaces.push({
    id: "gutter-front",
    name: "Front Gutter",
    type: "edge",
    worldPosition: { x: -halfW, y: h, z: 0 },
    endPosition: { x: halfW, y: h, z: 0 },
    normal: { x: 0, y: -1, z: 0 },
    snapRadius: ANCHOR_SNAP_RADIUS,
  });

  // ----- Windows -----
  template.windows.forEach((w: WindowSpec, idx: number) => {
    const frame = frames[w.wall];
    const cx = w.x + w.width / 2;
    const cy = w.y + w.height / 2;
    const pos = wallLocalToWorld(frame, cx, cy, 0.02);
    surfaces.push({
      id: `window-${w.wall}-${idx}`,
      name: `${capitalize(w.wall)} Window ${idx + 1}`,
      type: "face",
      worldPosition: pos,
      normal: { ...frame.outward },
      snapRadius: ANCHOR_SNAP_RADIUS,
    });
  });

  // ----- Doors -----
  template.doors.forEach((door: DoorSpec, idx: number) => {
    const frame = frames[door.wall];
    const cx = door.x + door.width / 2;
    const cy = door.height / 2;
    const pos = wallLocalToWorld(frame, cx, cy, 0.02);
    const id = door.wall === "front" && idx === 0 ? "door-front" : `door-${door.wall}-${idx}`;
    surfaces.push({
      id,
      name: door.wall === "front" ? "Front Door" : `${capitalize(door.wall)} Door`,
      type: "face",
      worldPosition: pos,
      normal: { ...frame.outward },
      snapRadius: ANCHOR_SNAP_RADIUS,
    });
  });

  // ----- Bush row -----
  if (template.bushRow) {
    const totalWidth = (template.bushRow.count - 1) * template.bushRow.spacing;
    const bushZ = -template.bushRow.y;
    const bushTopY = 0.4 * 1.7; // sphere radius * approx top factor — keep modest
    surfaces.push({
      id: "bush-row",
      name: "Bush Row",
      type: "edge",
      worldPosition: { x: -totalWidth / 2, y: bushTopY, z: bushZ },
      endPosition: { x: totalWidth / 2, y: bushTopY, z: bushZ },
      normal: { ...UP },
      snapRadius: ANCHOR_SNAP_RADIUS,
    });
  }

  // ----- Ground: driveway (only if garage) -----
  if (template.garage) {
    const leftEdge = -halfW + template.garage.offsetX;
    const drivewayCenterX = leftEdge + template.garage.width / 2;
    // Driveway sits in front of garage, between z = -garage.depth and the front
    // of the property — we use a patch centered at z = -garage.depth - 2.
    const drivewayCenterZ = -template.garage.depth - 2;
    surfaces.push({
      id: "ground-driveway",
      name: "Driveway",
      type: "face",
      worldPosition: { x: drivewayCenterX, y: 0.01, z: drivewayCenterZ },
      normal: { ...UP },
      snapRadius: ANCHOR_SNAP_RADIUS,
    });
  }

  // ----- Ground: open yard in front of front door -----
  surfaces.push({
    id: "ground-yard",
    name: "Front Yard",
    type: "face",
    worldPosition: { x: 0, y: 0.01, z: -3 },
    normal: { ...UP },
    snapRadius: ANCHOR_SNAP_RADIUS,
  });

  return surfaces;
}

export function useSurfaces(template: HouseTemplate3D): {
  map: Map<string, AnchorSurface>;
  list: AnchorSurface[];
} {
  return useMemo(() => {
    const list = computeSurfaces(template);
    const map = new Map<string, AnchorSurface>();
    for (const s of list) map.set(s.id, s);
    return { map, list };
  }, [template]);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
