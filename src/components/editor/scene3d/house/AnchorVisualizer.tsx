"use client";

/**
 * Renders a glowing highlight for ONE anchor surface — the nearest snap
 * target during a drag operation.
 *
 *   - edge:  thin line between worldPosition and endPosition
 *   - face:  flat ring oriented to face along the surface normal
 *   - point: small sphere at worldPosition
 *
 * Uses meshBasicMaterial so the highlight ignores scene lighting / fog and
 * always reads cleanly in warm amber.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { AnchorSurface } from "@/lib/3d/types";
import { COLOR_HIGHLIGHT } from "@/lib/3d/constants";

export interface AnchorVisualizerProps {
  surface: AnchorSurface | null;
  visible: boolean;
}

export function AnchorVisualizer({ surface, visible }: AnchorVisualizerProps) {
  const groupRef = useRef<Group>(null);

  // Gentle pulse — scale oscillates ~ +/- 8% at ~1.6 Hz
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const s = 1 + Math.sin(t * Math.PI * 1.6) * 0.08;
    groupRef.current.scale.set(s, s, s);
  });

  if (!surface || !visible) return null;

  return (
    <group ref={groupRef} name="anchor-visualizer">
      {surface.type === "edge" ? (
        <EdgeHighlight surface={surface} />
      ) : surface.type === "face" ? (
        <FaceHighlight surface={surface} />
      ) : (
        <PointHighlight surface={surface} />
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Edge highlight — a thin cylinder bridging worldPosition -> endPosition
// ---------------------------------------------------------------------------

function EdgeHighlight({ surface }: { surface: AnchorSurface }) {
  const end = surface.endPosition ?? surface.worldPosition;
  const start = surface.worldPosition;

  const { center, length, rotation } = useMemo(() => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const cz = (start.z + end.z) / 2;

    // Cylinder default axis is Y. We need to rotate so Y maps to (dx,dy,dz)/len.
    // Compute rotation: rotateX, then rotateZ derived from the direction.
    // Use a simple approach: rotate around an axis perpendicular to (0,1,0) and dir.
    // We return Euler rotations computed via spherical-ish: tilt then yaw.
    const dirX = dx / len;
    const dirY = dy / len;
    const dirZ = dz / len;
    // Yaw around Y so the projection onto XZ-plane aligns
    const yaw = Math.atan2(dirX, dirZ);
    // Pitch: angle from +Y axis
    const horiz = Math.sqrt(dirX * dirX + dirZ * dirZ);
    const pitch = Math.atan2(horiz, dirY); // 0 means pointing up, PI/2 means horizontal
    return {
      center: [cx, cy, cz] as [number, number, number],
      length: len,
      rotation: [pitch, yaw, 0] as [number, number, number],
    };
  }, [start.x, start.y, start.z, end.x, end.y, end.z]);

  return (
    <group position={center} rotation={rotation}>
      {/* Thin highlight cylinder oriented along local +Y after rotation */}
      <mesh>
        <cylinderGeometry args={[0.06, 0.06, length, 12, 1, false]} />
        <meshBasicMaterial color={COLOR_HIGHLIGHT} transparent opacity={0.85} />
      </mesh>
      {/* End caps so the line reads at endpoints */}
      <mesh position={[0, length / 2, 0]}>
        <sphereGeometry args={[0.1, 16, 12]} />
        <meshBasicMaterial color={COLOR_HIGHLIGHT} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, -length / 2, 0]}>
        <sphereGeometry args={[0.1, 16, 12]} />
        <meshBasicMaterial color={COLOR_HIGHLIGHT} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Face highlight — flat ring aligned to the surface normal
// ---------------------------------------------------------------------------

function FaceHighlight({ surface }: { surface: AnchorSurface }) {
  const { x, y, z } = surface.worldPosition;
  const n = surface.normal;
  const rotation = useMemo(() => normalToEuler(n.x, n.y, n.z), [n.x, n.y, n.z]);

  return (
    <group position={[x, y, z]} rotation={rotation}>
      {/* Ring on local XY plane (normal pointing along local +Z) */}
      <mesh>
        <ringGeometry args={[0.25, 0.38, 32]} />
        <meshBasicMaterial color={COLOR_HIGHLIGHT} transparent opacity={0.85} side={2} />
      </mesh>
      {/* Small filled dot in the middle */}
      <mesh position={[0, 0, 0.005]}>
        <circleGeometry args={[0.08, 24]} />
        <meshBasicMaterial color={COLOR_HIGHLIGHT} transparent opacity={0.7} side={2} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Point highlight — small sphere
// ---------------------------------------------------------------------------

function PointHighlight({ surface }: { surface: AnchorSurface }) {
  const { x, y, z } = surface.worldPosition;
  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[0.16, 18, 14]} />
      <meshBasicMaterial color={COLOR_HIGHLIGHT} transparent opacity={0.85} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Given a normal vector (nx, ny, nz), return an Euler rotation [x, y, z]
 * such that a plane on local XY (with its default normal along +Z) is rotated
 * to face along that normal in world space.
 */
function normalToEuler(nx: number, ny: number, nz: number): [number, number, number] {
  // Default ring normal is (0, 0, 1).
  // We want to rotate (0,0,1) to (nx,ny,nz).
  // Use yaw around Y then pitch around X.
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  const ux = nx / len;
  const uy = ny / len;
  const uz = nz / len;
  const yaw = Math.atan2(ux, uz);
  const pitch = -Math.asin(uy);
  return [pitch, yaw, 0];
}
