"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Fixture } from "@/lib/fixtures/types";
import type { Fixture3DLayout, Vec3 } from "@/lib/3d/types";
import { vec3ToTuple } from "@/lib/3d/types";
import { COLOR_HIGHLIGHT } from "@/lib/3d/constants";
import {
  DEFAULT_PIXEL_COLOR,
  getFixtureColor,
} from "@/lib/3d/fixture-renderer";

export interface PointFixture3DProps {
  fixture: Fixture;
  layout: Fixture3DLayout;
  selected: boolean;
  effectAtPlayhead: { id?: string; effect?: string; color?: string } | null;
  playheadSeconds: number;
  onSelect: (fixtureId: string, additive: boolean) => void;
  /** Unused for point fixtures today, kept for prop parity with strand. */
  onWaypointDrag?: (
    fixtureId: string,
    waypointIndex: number,
    newPos: Vec3,
  ) => void;
}

const SPHERE_RADIUS = 0.07;
const SELECT_RING_INNER = 0.12;
const SELECT_RING_OUTER = 0.18;

/**
 * Renders a point-style fixture (window outlines, bush rows, single-point
 * props). Each entry in `layout.points` is treated as an independent light,
 * not as a path vertex.
 */
export function PointFixture3D({
  fixture,
  layout,
  selected,
  effectAtPlayhead,
  playheadSeconds,
  onSelect,
}: PointFixture3DProps) {
  const pts = layout.points;
  const pixelCount = Math.max(pts.length, fixture.pixelCount || pts.length);

  const colors = useMemo<[number, number, number][]>(() => {
    return pts.map((_, i) =>
      getFixtureColor(effectAtPlayhead, playheadSeconds, i, pixelCount),
    );
  }, [pts, effectAtPlayhead, playheadSeconds, pixelCount]);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    onSelect(fixture.id, additive);
  };

  return (
    <group>
      {pts.map((p, i) => {
        const c = colors[i] ?? DEFAULT_PIXEL_COLOR;
        const colorStr = `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
        const isDark =
          c[0] + c[1] + c[2] <
          DEFAULT_PIXEL_COLOR[0] +
            DEFAULT_PIXEL_COLOR[1] +
            DEFAULT_PIXEL_COLOR[2] +
            0.05;
        return (
          <group key={i} position={vec3ToTuple(p)}>
            <mesh onPointerDown={handleClick} castShadow>
              <sphereGeometry args={[SPHERE_RADIUS, 14, 14]} />
              <meshStandardMaterial
                color={colorStr}
                emissive={colorStr}
                emissiveIntensity={isDark ? 0.25 : 1.2}
                roughness={0.5}
                metalness={0.0}
              />
            </mesh>
            {selected && (
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -SPHERE_RADIUS - 0.005, 0]}
              >
                <ringGeometry
                  args={[SELECT_RING_INNER, SELECT_RING_OUTER, 24]}
                />
                <meshBasicMaterial
                  color={COLOR_HIGHLIGHT}
                  transparent
                  opacity={0.7}
                  side={2 /* THREE.DoubleSide */}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
