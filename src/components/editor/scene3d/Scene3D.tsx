"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { DEFAULT_SCENE_CONFIG } from "@/lib/3d/constants";
import { OrbitCamera } from "./camera/OrbitCamera";
import { GroundPlane } from "./GroundPlane";

export interface Scene3DProps {
  children?: ReactNode;
  /** Show the ground grid (default true) */
  showGrid?: boolean;
  /** Background color (defaults to soft cream) */
  backgroundColor?: string;
  /** Allow camera orbit/pan/zoom (default true). The interaction layer
   * sets this false during drag/draw. */
  controlsEnabled?: boolean;
}

/**
 * Root R3F Canvas for the 3D layout view.
 * Mounts lighting, camera with orbit controls, fog, and the ground plane.
 * Pass house and fixture components as children.
 */
export function Scene3D({
  children,
  showGrid = true,
  backgroundColor = "#FAFAF8",
  controlsEnabled = true,
}: Scene3DProps) {
  const cfg = DEFAULT_SCENE_CONFIG;
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      camera={{
        position: [cfg.cameraPosition.x, cfg.cameraPosition.y, cfg.cameraPosition.z],
        fov: 45,
        near: 0.1,
        far: 200,
      }}
      style={{ background: backgroundColor, width: "100%", height: "100%" }}
    >
      <color attach="background" args={[backgroundColor]} />
      <fog attach="fog" args={[backgroundColor, cfg.fogNear, cfg.fogFar]} />

      <ambientLight intensity={cfg.ambientIntensity} color="#FFF6E0" />
      <directionalLight
        position={[10, 14, 8]}
        intensity={cfg.directionalIntensity}
        color="#FFF1D0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
      />
      {/* Soft fill from opposite side */}
      <directionalLight position={[-8, 6, -6]} intensity={0.18} color="#E8F0FF" />

      <OrbitCamera enabled={controlsEnabled} />
      <GroundPlane showGrid={showGrid} />

      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  );
}
