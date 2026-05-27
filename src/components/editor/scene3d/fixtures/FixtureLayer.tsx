"use client";

import type { Fixture } from "@/lib/fixtures/types";
import type { Fixture3DLayout, Vec3 } from "@/lib/3d/types";
import { StrandFixture3D } from "./StrandFixture3D";
import { PointFixture3D } from "./PointFixture3D";

type ActiveEffect = {
  id?: string;
  effect?: string;
  color?: string;
} | null;

export interface FixtureLayerProps {
  fixtures: Fixture[];
  /** Keyed by fixture.id. Fixtures missing a layout entry are skipped. */
  layouts: Record<string, Fixture3DLayout>;
  selectedIds: string[];
  /** Active effect (if any) per fixture id at the current playhead. */
  activeEffectsByFixtureId: Record<string, ActiveEffect>;
  playheadSeconds: number;
  onSelect: (fixtureId: string, additive: boolean) => void;
  onWaypointDrag?: (
    fixtureId: string,
    waypointIndex: number,
    newPos: Vec3,
  ) => void;
}

/**
 * Distinguishes "strand" fixtures (rendered as a tube along a polyline) from
 * "point" fixtures (rendered as one independent light per layout point).
 * Matrix is treated as strand because its layout points trace the wiring
 * path; individual cells are a future enhancement.
 */
const STRAND_KINDS: ReadonlySet<Fixture["kind"]> = new Set<Fixture["kind"]>([
  "roofline",
  "mega-tree",
  "mini-tree",
  "arch",
  "matrix",
]);

/**
 * Renders every fixture that has a 3D layout entry. Fixtures without a
 * layout are silently skipped — they exist in the project but haven't been
 * placed in the scene yet.
 */
export function FixtureLayer({
  fixtures,
  layouts,
  selectedIds,
  activeEffectsByFixtureId,
  playheadSeconds,
  onSelect,
  onWaypointDrag,
}: FixtureLayerProps) {
  const selectedSet = new Set(selectedIds);

  return (
    <group>
      {fixtures.map((fixture) => {
        const layout = layouts[fixture.id];
        if (!layout) return null;
        const selected = selectedSet.has(fixture.id);
        const effect = activeEffectsByFixtureId[fixture.id] ?? null;
        const isStrand = STRAND_KINDS.has(fixture.kind);

        if (isStrand) {
          return (
            <StrandFixture3D
              key={fixture.id}
              fixture={fixture}
              layout={layout}
              selected={selected}
              effectAtPlayhead={effect}
              playheadSeconds={playheadSeconds}
              onSelect={onSelect}
              onWaypointDrag={onWaypointDrag}
            />
          );
        }

        return (
          <PointFixture3D
            key={fixture.id}
            fixture={fixture}
            layout={layout}
            selected={selected}
            effectAtPlayhead={effect}
            playheadSeconds={playheadSeconds}
            onSelect={onSelect}
            onWaypointDrag={onWaypointDrag}
          />
        );
      })}
    </group>
  );
}
