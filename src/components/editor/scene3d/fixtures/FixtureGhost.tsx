"use client";

import type { Fixture } from "@/lib/fixtures/types";
import type { Vec3 } from "@/lib/3d/types";
import { vec3ToTuple } from "@/lib/3d/types";
import { COLOR_HIGHLIGHT } from "@/lib/3d/constants";

export interface FixtureGhostProps {
  kind: Fixture["kind"];
  /** World-space position of the cursor projection. */
  position: Vec3;
  /** True when snapping to an anchor — renders slightly brighter. */
  snapped: boolean;
}

/**
 * Semi-transparent preview rendered while a user drags a fixture from the
 * sidebar onto the scene. The shape is a rough hint at the eventual fixture
 * silhouette — the real geometry is placed once the drop is committed.
 */
export function FixtureGhost({ kind, position, snapped }: FixtureGhostProps) {
  const opacity = snapped ? 0.85 : 0.5;

  return (
    <group position={vec3ToTuple(position)}>
      {renderShape(kind, opacity)}
    </group>
  );
}

function renderShape(kind: Fixture["kind"], opacity: number) {
  switch (kind) {
    case "roofline":
      // Short horizontal stub to hint at strand direction.
      return (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
          <meshBasicMaterial
            color={COLOR_HIGHLIGHT}
            transparent
            opacity={opacity}
          />
        </mesh>
      );
    case "arch":
      // Half-torus arc roughly the size of a yard arch.
      return (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.6, 0.05, 6, 18, Math.PI]} />
          <meshBasicMaterial
            color={COLOR_HIGHLIGHT}
            transparent
            opacity={opacity}
          />
        </mesh>
      );
    case "mega-tree":
      return (
        <mesh position={[0, 1.2, 0]}>
          <coneGeometry args={[0.7, 2.4, 12]} />
          <meshBasicMaterial
            color={COLOR_HIGHLIGHT}
            transparent
            opacity={opacity}
          />
        </mesh>
      );
    case "mini-tree":
      return (
        <mesh position={[0, 0.5, 0]}>
          <coneGeometry args={[0.3, 1.0, 10]} />
          <meshBasicMaterial
            color={COLOR_HIGHLIGHT}
            transparent
            opacity={opacity}
          />
        </mesh>
      );
    case "matrix":
      return (
        <mesh>
          <boxGeometry args={[0.9, 0.6, 0.05]} />
          <meshBasicMaterial
            color={COLOR_HIGHLIGHT}
            transparent
            opacity={opacity}
          />
        </mesh>
      );
    case "window-outline":
      return (
        <mesh>
          <boxGeometry args={[0.8, 0.6, 0.04]} />
          <meshBasicMaterial
            color={COLOR_HIGHLIGHT}
            transparent
            opacity={opacity}
            wireframe
          />
        </mesh>
      );
    case "bush":
      return (
        <mesh>
          <sphereGeometry args={[0.35, 12, 12]} />
          <meshBasicMaterial
            color={COLOR_HIGHLIGHT}
            transparent
            opacity={opacity}
          />
        </mesh>
      );
    case "custom":
    default:
      return (
        <mesh>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshBasicMaterial
            color={COLOR_HIGHLIGHT}
            transparent
            opacity={opacity}
          />
        </mesh>
      );
  }
}
