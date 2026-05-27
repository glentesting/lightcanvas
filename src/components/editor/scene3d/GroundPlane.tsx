"use client";

import { Grid } from "@react-three/drei";
import { COLOR_GRID, COLOR_GROUND, GRID_SIZE } from "@/lib/3d/constants";

export interface GroundPlaneProps {
  showGrid?: boolean;
}

/**
 * Ground plane + grid overlay. The mesh receives shadows and serves
 * as the raycast target for prop drops on open lawn.
 */
export function GroundPlane({ showGrid = true }: GroundPlaneProps) {
  const half = GRID_SIZE / 2;
  return (
    <group>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        name="ground"
      >
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshStandardMaterial color={COLOR_GROUND} roughness={1} metalness={0} />
      </mesh>
      {showGrid && (
        <Grid
          position={[0, 0.01, 0]}
          args={[GRID_SIZE, GRID_SIZE]}
          cellSize={1}
          cellThickness={0.5}
          cellColor={COLOR_GRID}
          sectionSize={5}
          sectionThickness={1}
          sectionColor={COLOR_GRID}
          fadeDistance={half * 1.4}
          fadeStrength={1.2}
          followCamera={false}
          infiniteGrid={false}
        />
      )}
    </group>
  );
}
