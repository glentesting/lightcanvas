"use client";

/**
 * Pure parametric render of a HouseTemplate3D.
 *
 * Coordinate convention (matches house-templates.ts):
 *   - Origin (0, 0, 0) at front-center of the footprint on the ground.
 *   - Front wall sits on z = 0, back wall on z = depth.
 *   - Left wall at x = -width/2, right wall at x = +width/2.
 *   - Y is up.
 *
 * Wall offsets ("x" on WindowSpec / DoorSpec) are measured from the LEFT end
 * of that wall when looking AT it from outside.
 *   - front wall: left end is x = -width/2, increases with +X
 *   - back wall:  left end is x = +width/2, increases with -X
 *   - left wall:  left end is z = 0 (front),  increases with +Z (toward back)
 *   - right wall: left end is z = depth (back), increases with -Z (toward front)
 */

import { useMemo } from "react";
import { Shape } from "three";
import type {
  DoorSpec,
  HouseTemplate3D,
  WindowSpec,
} from "@/lib/3d/types";
import {
  COLOR_BUSH,
  COLOR_DOOR,
  COLOR_GARAGE,
  COLOR_ROOF,
  COLOR_WALL,
  COLOR_WINDOW,
} from "@/lib/3d/constants";

const WALL_THICKNESS = 0.18;
const FEATURE_OUT = 0.025; // how far windows/door pop out from the wall plane
const FLAT_ROOF_THICKNESS = 0.25;
const FLAT_ROOF_OVERHANG = 0.25;

export interface HouseGeometryProps {
  template: HouseTemplate3D;
}

interface WallFrame {
  /** Center of the wall in world space */
  center: [number, number, number];
  /** Y-rotation so a flat panel on the XY-plane faces outward */
  rotationY: number;
  /** Length of the wall along its local X */
  length: number;
  /** Outward normal in world space */
  outward: [number, number, number];
  /** Right-vector along the wall surface (left-to-right when looking at the face) */
  right: [number, number, number];
}

/** Build the 4 wall frames keyed by side. */
function buildWallFrames(template: HouseTemplate3D): Record<"front" | "back" | "left" | "right", WallFrame> {
  const halfW = template.width / 2;
  const h = template.wallHeight;
  return {
    front: {
      center: [0, h / 2, 0],
      rotationY: 0,
      length: template.width,
      outward: [0, 0, -1],
      right: [1, 0, 0],
    },
    back: {
      center: [0, h / 2, template.depth],
      rotationY: Math.PI,
      length: template.width,
      outward: [0, 0, 1],
      right: [-1, 0, 0],
    },
    left: {
      center: [-halfW, h / 2, template.depth / 2],
      rotationY: -Math.PI / 2,
      length: template.depth,
      outward: [-1, 0, 0],
      right: [0, 0, 1],
    },
    right: {
      center: [halfW, h / 2, template.depth / 2],
      rotationY: Math.PI / 2,
      length: template.depth,
      outward: [1, 0, 0],
      right: [0, 0, -1],
    },
  };
}

/** Convert a wall-local (x along wall, y from ground) coord to world position
 *  on the OUTSIDE face of the wall, slightly popped out by `popOut`. */
function wallLocalToWorld(
  frame: WallFrame,
  xAlongWall: number,
  yFromGround: number,
  wallLength: number,
  popOut: number,
): [number, number, number] {
  // Convert "from left end of wall" to centered offset along the wall.
  const offset = xAlongWall - wallLength / 2;
  const cx = frame.center[0] + frame.right[0] * offset + frame.outward[0] * popOut;
  const cy = yFromGround;
  const cz = frame.center[2] + frame.right[2] * offset + frame.outward[2] * popOut;
  return [cx, cy, cz];
}

export function HouseGeometry({ template }: HouseGeometryProps) {
  const frames = useMemo(() => buildWallFrames(template), [template]);

  const h = template.wallHeight;
  const isPitched = template.roofPitch > 0;
  const ridgeHeight = isPitched ? h + (template.width / 2) * template.roofPitch : h;

  return (
    <group name="house3d">
      {/* ----- Walls ----- */}
      {/* Front */}
      <mesh
        castShadow
        receiveShadow
        position={frames.front.center}
        rotation={[0, frames.front.rotationY, 0]}
        name="wall-front"
      >
        <boxGeometry args={[template.width, h, WALL_THICKNESS]} />
        <meshStandardMaterial color={COLOR_WALL} roughness={0.85} metalness={0} />
      </mesh>
      {/* Back */}
      <mesh
        castShadow
        receiveShadow
        position={frames.back.center}
        rotation={[0, frames.back.rotationY, 0]}
        name="wall-back"
      >
        <boxGeometry args={[template.width, h, WALL_THICKNESS]} />
        <meshStandardMaterial color={COLOR_WALL} roughness={0.85} metalness={0} />
      </mesh>
      {/* Left */}
      <mesh
        castShadow
        receiveShadow
        position={frames.left.center}
        rotation={[0, frames.left.rotationY, 0]}
        name="wall-left"
      >
        <boxGeometry args={[template.depth, h, WALL_THICKNESS]} />
        <meshStandardMaterial color={COLOR_WALL} roughness={0.85} metalness={0} />
      </mesh>
      {/* Right */}
      <mesh
        castShadow
        receiveShadow
        position={frames.right.center}
        rotation={[0, frames.right.rotationY, 0]}
        name="wall-right"
      >
        <boxGeometry args={[template.depth, h, WALL_THICKNESS]} />
        <meshStandardMaterial color={COLOR_WALL} roughness={0.85} metalness={0} />
      </mesh>

      {/* ----- Roof ----- */}
      {isPitched ? (
        <PitchedRoof
          width={template.width}
          depth={template.depth}
          wallHeight={h}
          ridgeHeight={ridgeHeight}
        />
      ) : (
        <FlatRoof width={template.width} depth={template.depth} wallHeight={h} />
      )}

      {/* ----- Garage ----- */}
      {template.garage && (
        <GarageBlock
          width={template.garage.width}
          depth={template.garage.depth}
          height={template.garage.height}
          offsetX={template.garage.offsetX}
          houseWidth={template.width}
        />
      )}

      {/* ----- Windows ----- */}
      {template.windows.map((w, i) => (
        <WindowPane
          key={`window-${w.wall}-${i}`}
          spec={w}
          frame={frames[w.wall]}
        />
      ))}

      {/* ----- Doors ----- */}
      {template.doors.map((door, i) => (
        <DoorPanel
          key={`door-${door.wall}-${i}`}
          spec={door}
          frame={frames[door.wall]}
        />
      ))}

      {/* ----- Bushes ----- */}
      {template.bushRow && (
        <BushRow
          y={template.bushRow.y}
          count={template.bushRow.count}
          spacing={template.bushRow.spacing}
          houseWidth={template.width}
        />
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Sub-pieces
// ---------------------------------------------------------------------------

interface PitchedRoofProps {
  width: number;
  depth: number;
  wallHeight: number;
  ridgeHeight: number;
}

/**
 * Pitched roof: two sloped planes meeting at a ridge that runs front-to-back
 * (parallel to z-axis), plus two triangular gables (one on front wall, one on
 * back wall).
 *
 * Pitch is rise/run with the run = width/2, so the ridge sits over x=0.
 */
function PitchedRoof({ width, depth, wallHeight, ridgeHeight }: PitchedRoofProps) {
  const halfW = width / 2;
  const rise = ridgeHeight - wallHeight;
  const slopeLength = Math.sqrt(halfW * halfW + rise * rise);
  // Angle from horizontal — used to tilt each roof plane around the z-axis.
  const slopeAngle = Math.atan2(rise, halfW);

  const overhang = 0.3;
  const planeDepth = depth + overhang * 2;

  // Center of each sloped plane: halfway up the slope from the eave.
  // For the right plane, plane runs from (x=halfW, y=wallHeight) up to (x=0, y=ridgeHeight).
  // The midpoint is (halfW/2, wallHeight + rise/2).
  const midRightX = halfW / 2;
  const midRightY = wallHeight + rise / 2;

  return (
    <group name="roof-pitched">
      {/* Right slope */}
      <mesh
        castShadow
        receiveShadow
        position={[midRightX, midRightY, depth / 2]}
        rotation={[0, 0, slopeAngle]}
        name="roof-slope-right"
      >
        <boxGeometry args={[slopeLength + overhang, 0.08, planeDepth]} />
        <meshStandardMaterial color={COLOR_ROOF} roughness={0.7} metalness={0} />
      </mesh>
      {/* Left slope (mirror) */}
      <mesh
        castShadow
        receiveShadow
        position={[-midRightX, midRightY, depth / 2]}
        rotation={[0, 0, -slopeAngle]}
        name="roof-slope-left"
      >
        <boxGeometry args={[slopeLength + overhang, 0.08, planeDepth]} />
        <meshStandardMaterial color={COLOR_ROOF} roughness={0.7} metalness={0} />
      </mesh>

      {/* Front gable triangle */}
      <Gable
        width={width}
        wallHeight={wallHeight}
        ridgeHeight={ridgeHeight}
        z={0}
        outwardZ={-1}
      />
      {/* Back gable triangle */}
      <Gable
        width={width}
        wallHeight={wallHeight}
        ridgeHeight={ridgeHeight}
        z={depth}
        outwardZ={1}
      />
    </group>
  );
}

interface GableProps {
  width: number;
  wallHeight: number;
  ridgeHeight: number;
  z: number;
  outwardZ: -1 | 1;
}

/** Triangular wall section that fills the gable end above the rectangular wall. */
function Gable({ width, wallHeight, ridgeHeight, z, outwardZ }: GableProps) {
  const halfW = width / 2;
  const rise = ridgeHeight - wallHeight;
  // Build a triangle as a BufferGeometry via a Shape would be heavier; use
  // a thin box rotated... simpler: use ShapeGeometry via three.js? We can use
  // a flat triangular buffer geometry inline.

  // We'll use a CustomTriangle via primitive ShapeGeometry from THREE namespace
  // through r3f's <shapeGeometry>.
  // Triangle vertices (in local XY): (-halfW, 0), (halfW, 0), (0, rise)
  const shape = useMemo(() => {
    const s = new Shape();
    s.moveTo(-halfW, 0);
    s.lineTo(halfW, 0);
    s.lineTo(0, rise);
    s.lineTo(-halfW, 0);
    return s;
  }, [halfW, rise]);

  return (
    <mesh
      castShadow
      receiveShadow
      position={[0, wallHeight, z + outwardZ * 0.005]}
      rotation={[0, outwardZ === -1 ? 0 : Math.PI, 0]}
      name={`gable-${outwardZ === -1 ? "front" : "back"}`}
    >
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={COLOR_WALL} roughness={0.85} metalness={0} side={2} />
    </mesh>
  );
}

interface FlatRoofProps {
  width: number;
  depth: number;
  wallHeight: number;
}

function FlatRoof({ width, depth, wallHeight }: FlatRoofProps) {
  return (
    <mesh
      castShadow
      receiveShadow
      position={[0, wallHeight + FLAT_ROOF_THICKNESS / 2, depth / 2]}
      name="roof-flat"
    >
      <boxGeometry
        args={[
          width + FLAT_ROOF_OVERHANG * 2,
          FLAT_ROOF_THICKNESS,
          depth + FLAT_ROOF_OVERHANG * 2,
        ]}
      />
      <meshStandardMaterial color={COLOR_ROOF} roughness={0.85} metalness={0} />
    </mesh>
  );
}

interface GarageBlockProps {
  width: number;
  depth: number;
  height: number;
  offsetX: number;
  houseWidth: number;
}

/**
 * Garage block extends OUT from the front wall (into -z), with the front
 * face of the garage at z = -depth (in front of the house).
 *
 * Slightly recessed garage door panel sits on the garage's front face.
 */
function GarageBlock({ width, depth, height, offsetX, houseWidth }: GarageBlockProps) {
  // offsetX is measured along the front wall from the LEFT end (x = -houseWidth/2).
  // Garage center along x:
  const leftEdge = -houseWidth / 2 + offsetX;
  const centerX = leftEdge + width / 2;

  // The garage body is a box from z = -depth to z = 0 (just touching the front wall).
  const centerZ = -depth / 2;

  return (
    <group name="garage">
      {/* Garage body (walls + roof of garage as a single block) */}
      <mesh
        castShadow
        receiveShadow
        position={[centerX, height / 2, centerZ]}
        name="garage-body"
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={COLOR_WALL} roughness={0.85} metalness={0} />
      </mesh>
      {/* Garage door panel — slightly recessed into the front face */}
      <mesh
        castShadow
        receiveShadow
        position={[centerX, height * 0.45, -depth - 0.0001]}
        name="garage-door"
      >
        <boxGeometry args={[width * 0.85, height * 0.78, 0.04]} />
        <meshStandardMaterial color={COLOR_GARAGE} roughness={0.6} metalness={0.05} />
      </mesh>
    </group>
  );
}

interface WindowPaneProps {
  spec: WindowSpec;
  frame: WallFrame;
}

function WindowPane({ spec, frame }: WindowPaneProps) {
  // The window's bottom-left in wall-local coords is (spec.x, spec.y).
  // Convert its center to world space.
  const cx = spec.x + spec.width / 2;
  const cy = spec.y + spec.height / 2;
  const [wx, wy, wz] = wallLocalToWorld(frame, cx, cy, frame.length, FEATURE_OUT);

  return (
    <mesh
      castShadow
      receiveShadow
      position={[wx, wy, wz]}
      rotation={[0, frame.rotationY, 0]}
      name={`window-${spec.wall}`}
    >
      <boxGeometry args={[spec.width, spec.height, 0.04]} />
      <meshStandardMaterial
        color={COLOR_WINDOW}
        emissive={COLOR_WINDOW}
        emissiveIntensity={0.15}
        roughness={0.2}
        metalness={0.1}
      />
    </mesh>
  );
}

interface DoorPanelProps {
  spec: DoorSpec;
  frame: WallFrame;
}

function DoorPanel({ spec, frame }: DoorPanelProps) {
  const cx = spec.x + spec.width / 2;
  const cy = spec.height / 2; // door starts at ground
  const [wx, wy, wz] = wallLocalToWorld(frame, cx, cy, frame.length, FEATURE_OUT);

  return (
    <mesh
      castShadow
      receiveShadow
      position={[wx, wy, wz]}
      rotation={[0, frame.rotationY, 0]}
      name={`door-${spec.wall}`}
    >
      <boxGeometry args={[spec.width, spec.height, 0.05]} />
      <meshStandardMaterial color={COLOR_DOOR} roughness={0.7} metalness={0} />
    </mesh>
  );
}

interface BushRowProps {
  y: number;
  count: number;
  spacing: number;
  houseWidth: number;
}

function BushRow({ y, count, spacing, houseWidth }: BushRowProps) {
  // Center the row across the front of the house.
  const totalWidth = (count - 1) * spacing;
  const startX = -totalWidth / 2;
  const bushZ = -y; // y here is "distance in front of front wall", so -z direction
  const bushRadius = 0.4;
  const bushes = [];
  for (let i = 0; i < count; i++) {
    const x = startX + i * spacing;
    bushes.push(
      <mesh
        key={`bush-${i}`}
        castShadow
        receiveShadow
        position={[x, bushRadius * 0.85, bushZ]}
        name={`bush-${i}`}
      >
        <sphereGeometry args={[bushRadius, 12, 10]} />
        <meshStandardMaterial color={COLOR_BUSH} roughness={1} metalness={0} />
      </mesh>,
    );
  }
  // Reference unused so Math.min(houseWidth) tree-shake-safe
  void houseWidth;
  return <group name="bush-row">{bushes}</group>;
}
