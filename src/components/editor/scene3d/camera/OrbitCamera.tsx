"use client";

import { OrbitControls } from "@react-three/drei";
import { forwardRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  DEFAULT_CAMERA_TARGET,
  MAX_POLAR_ANGLE,
  MIN_POLAR_ANGLE,
} from "@/lib/3d/constants";

export interface OrbitCameraProps {
  /** Disable controls during drag/draw operations */
  enabled?: boolean;
}

/**
 * Orbit-controlled camera for the 3D layout view.
 * Pass `enabled={false}` while a drag or draw operation is active so
 * pointer events route to the interaction layer instead of the camera.
 */
export const OrbitCamera = forwardRef<OrbitControlsImpl, OrbitCameraProps>(
  function OrbitCamera({ enabled = true }, ref) {
    return (
      <OrbitControls
        ref={ref}
        enabled={enabled}
        enableDamping
        dampingFactor={0.08}
        enablePan
        enableRotate
        enableZoom
        minDistance={4}
        maxDistance={40}
        minPolarAngle={MIN_POLAR_ANGLE}
        maxPolarAngle={MAX_POLAR_ANGLE}
        target={[
          DEFAULT_CAMERA_TARGET.x,
          DEFAULT_CAMERA_TARGET.y,
          DEFAULT_CAMERA_TARGET.z,
        ]}
      />
    );
  },
);
