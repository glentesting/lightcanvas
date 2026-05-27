import type { Fixture, FixtureGroup } from "@/lib/fixtures/types";
import type { Sequence } from "@/lib/timeline/types";
import { EFFECT_REGISTRY, type RGB } from "./effects";

/**
 * Core render function: given the sequence, fixtures, and current time,
 * compute the RGB value of every pixel of every fixture.
 *
 * Returns a Map<fixtureId, RGB[]> where RGB[] has length === fixture.pixelCount.
 * Pure function — same inputs always produce same output.
 *
 * When groups are provided, group track effects are rendered first as a base
 * layer, then individual fixture effects override them (last-writer-wins).
 */
export function renderFrame(
  sequence: Sequence,
  fixtures: Fixture[],
  t: number,
  beats?: number[],
  groups?: FixtureGroup[]
): Map<string, RGB[]> {
  const result = new Map<string, RGB[]>();

  // First pass: render group effects as base for member fixtures
  if (groups) {
    for (const group of groups) {
      const groupBlocks = sequence.blocks.filter(
        (b) => b.trackId === group.id && t >= b.start && t <= b.start + b.duration
      );
      if (groupBlocks.length === 0) continue;

      const block = groupBlocks.reduce(
        (latest, b) => (b.start > latest.start ? b : latest),
        groupBlocks[0]
      );
      const effectFn = EFFECT_REGISTRY[block.effectId];
      if (!effectFn) continue;

      // Apply to each fixture in the group
      for (const fixtureId of group.fixtureIds) {
        const fixture = fixtures.find((f) => f.id === fixtureId);
        if (!fixture) continue;
        const pixels = effectFn({ block, fixture, t, beats });
        result.set(fixture.id, pixels); // Set as base — individual effects will overwrite
      }
    }
  }

  // Second pass: render individual fixture effects (override group)
  for (const fixture of fixtures) {
    const activeBlocks = sequence.blocks.filter(
      (b) => b.trackId === fixture.id && t >= b.start && t <= b.start + b.duration
    );

    if (activeBlocks.length === 0) {
      // If no individual effects, keep group effect (already in result) or set to off
      if (!result.has(fixture.id)) {
        result.set(fixture.id, Array.from({ length: fixture.pixelCount }, () => [0, 0, 0] as RGB));
      }
      continue;
    }

    // Individual effects override group
    const block = activeBlocks.reduce(
      (latest, b) => (b.start > latest.start ? b : latest),
      activeBlocks[0]
    );

    const effectFn = EFFECT_REGISTRY[block.effectId];
    if (!effectFn) {
      if (!result.has(fixture.id)) {
        result.set(fixture.id, Array.from({ length: fixture.pixelCount }, () => [0, 0, 0] as RGB));
      }
      continue;
    }

    const pixels = effectFn({ block, fixture, t, beats });
    result.set(fixture.id, pixels);
  }

  return result;
}
