"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Fixture } from "@/lib/fixtures/types";
import type { Fixture3DLayout, Vec3 } from "@/lib/3d/types";
import { vec3ToTuple } from "@/lib/3d/types";
import { COLOR_HIGHLIGHT } from "@/lib/3d/constants";
import {
  DEFAULT_PIXEL_COLOR,
  getFixtureColor,
  interpolateStrandPoints,
} from "@/lib/3d/fixture-renderer";

export interface StrandFixture3DProps {
  fixture: Fixture;
  layout: Fixture3DLayout;
  selected: boolean;
  effectAtPlayhead: { id?: string; effect?: string; color?: string } | null;
  playheadSeconds: number;
  onSelect: (fixtureId: string, additive: boolean) => void;
  onWaypointDrag?: (
    fixtureId: string,
    waypointIndex: number,
    newPos: Vec3,
  ) => void;
}

const TUBE_RADIUS = 0.04;
const TUBE_RADIAL_SEGMENTS = 6;
const WAYPOINT_RADIUS = 0.08;

/**
 * Renders a strand-style fixture (roofline, arch, mega/mini tree, matrix wiring)
 * as a thin tube tracing `layout.points`. When selected, shows an outline tube
 * and draggable waypoint handles at each path vertex.
 */
export function StrandFixture3D({
  fixture,
  layout,
  selected,
  effectAtPlayhead,
  playheadSeconds,
  onSelect,
  onWaypointDrag,
}: StrandFixture3DProps) {
  const pts = layout.points;

  // Build the curve once per layout change. CatmullRom for >2 points so trees
  // bend smoothly; straight segments use a simple Line curve via two-point
  // CatmullRom (degenerates to a line) for consistency.
  const curve = useMemo(() => {
    if (pts.length < 2) return null;
    const vectors = pts.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    return new THREE.CatmullRomCurve3(
      vectors,
      layout.closed,
      "catmullrom",
      0.5,
    );
  }, [pts, layout.closed]);

  // Average pixel color drives the tube's emissive tint. Cheap proxy for
  // per-pixel coloring; real rendering pipeline handles per-pixel exactness.
  const avgColor = useMemo<[number, number, number]>(() => {
    const count = Math.max(1, fixture.pixelCount);
    let r = 0;
    let g = 0;
    let b = 0;
    // Sample at most 16 pixels — enough to average without burning CPU.
    const samples = Math.min(count, 16);
    for (let i = 0; i < samples; i++) {
      const idx = Math.floor((i / samples) * count);
      const c = getFixtureColor(
        effectAtPlayhead,
        playheadSeconds,
        idx,
        count,
      );
      r += c[0];
      g += c[1];
      b += c[2];
    }
    return [r / samples, g / samples, b / samples];
  }, [fixture.pixelCount, effectAtPlayhead, playheadSeconds]);

  // Pre-compute interpolated pixel positions so they're not recomputed in
  // sub-components. Currently unused for rendering (tube only) but kept to
  // make the future "per-pixel sphere mode" trivial to enable.
  void useMemo(
    () => interpolateStrandPoints(layout, fixture.pixelCount),
    [layout, fixture.pixelCount],
  );

  const segments = Math.max(8, pts.length * 12);
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    onSelect(fixture.id, additive);
  };

  if (!curve) {
    // Single point or empty — render a small marker so it's still selectable.
    const p = pts[0] ?? { x: 0, y: 0, z: 0 };
    return (
      <group position={vec3ToTuple(p)}>
        <mesh onPointerDown={handleClick} castShadow>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial
            color={`rgb(${Math.round(avgColor[0] * 255)},${Math.round(avgColor[1] * 255)},${Math.round(avgColor[2] * 255)})`}
            emissive={`rgb(${Math.round(avgColor[0] * 255)},${Math.round(avgColor[1] * 255)},${Math.round(avgColor[2] * 255)})`}
            emissiveIntensity={0.7}
          />
        </mesh>
        {selected && (
          <mesh>
            <sphereGeometry args={[0.14, 16, 16]} />
            <meshBasicMaterial
              color={COLOR_HIGHLIGHT}
              transparent
              opacity={0.4}
            />
          </mesh>
        )}
      </group>
    );
  }

  const colorStr = `rgb(${Math.round(avgColor[0] * 255)},${Math.round(avgColor[1] * 255)},${Math.round(avgColor[2] * 255)})`;
  const isDark =
    avgColor[0] + avgColor[1] + avgColor[2] <
    DEFAULT_PIXEL_COLOR[0] +
      DEFAULT_PIXEL_COLOR[1] +
      DEFAULT_PIXEL_COLOR[2] +
      0.05;

  return (
    <group>
      {/* Selection outline tube (drawn behind, larger radius). */}
      {selected && (
        <mesh>
          <tubeGeometry
            args={[
              curve,
              segments,
              TUBE_RADIUS * 1.6,
              TUBE_RADIAL_SEGMENTS,
              layout.closed,
            ]}
          />
          <meshBasicMaterial
            color={COLOR_HIGHLIGHT}
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* The strand itself. */}
      <mesh onPointerDown={handleClick} castShadow receiveShadow>
        <tubeGeometry
          args={[
            curve,
            segments,
            TUBE_RADIUS,
            TUBE_RADIAL_SEGMENTS,
            layout.closed,
          ]}
        />
        <meshStandardMaterial
          color={colorStr}
          emissive={colorStr}
          emissiveIntensity={isDark ? 0.25 : 0.9}
          roughness={0.6}
          metalness={0.0}
        />
      </mesh>

      {/* Waypoint handles (only when selected). */}
      {selected &&
        pts.map((p, i) => (
          <mesh
            key={i}
            position={vec3ToTuple(p)}
            onPointerDown={(event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              // The interaction layer owns the actual drag math; we just
              // signal the intent and pass the current waypoint position.
              onWaypointDrag?.(fixture.id, i, { x: p.x, y: p.y, z: p.z });
            }}
          >
            <sphereGeometry args={[WAYPOINT_RADIUS, 12, 12]} />
            <meshBasicMaterial color={COLOR_HIGHLIGHT} />
          </mesh>
        ))}
    </group>
  );
}
