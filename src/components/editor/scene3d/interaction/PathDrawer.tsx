"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/lib/3d/types";
import { COLOR_HIGHLIGHT } from "@/lib/3d/constants";

export interface PathDrawerProps {
  waypoints: Vec3[];
  hover: Vec3 | null;
}

/**
 * Visual feedback while the user is laying down a path with the pen tool.
 * Renders the committed waypoints as small spheres connected by a line,
 * plus a faded ghost segment from the last waypoint to the hover position.
 */
export function PathDrawer({ waypoints, hover }: PathDrawerProps) {
  const linePoints = useMemo(() => {
    if (waypoints.length === 0) return [] as THREE.Vector3[];
    const pts = waypoints.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    if (hover) pts.push(new THREE.Vector3(hover.x, hover.y, hover.z));
    return pts;
  }, [waypoints, hover]);

  const committedGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(linePoints);
    return geom;
  }, [linePoints]);

  if (waypoints.length === 0 && !hover) return null;

  return (
    <group name="path-drawer">
      {/* committed + hover line */}
      {linePoints.length >= 2 && (
        <line>
          <primitive object={committedGeometry} attach="geometry" />
          <lineBasicMaterial color={COLOR_HIGHLIGHT} transparent opacity={0.85} />
        </line>
      )}
      {/* waypoint spheres */}
      {waypoints.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[0.08, 12, 10]} />
          <meshBasicMaterial color={COLOR_HIGHLIGHT} />
        </mesh>
      ))}
      {/* hover preview point */}
      {hover && (
        <mesh position={[hover.x, hover.y, hover.z]}>
          <sphereGeometry args={[0.06, 12, 10]} />
          <meshBasicMaterial color={COLOR_HIGHLIGHT} transparent opacity={0.45} />
        </mesh>
      )}
    </group>
  );
}
