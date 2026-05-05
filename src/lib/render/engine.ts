import type { Fixture } from "@/lib/fixtures/types";
import type { Sequence } from "@/lib/timeline/types";
import { EFFECT_REGISTRY, type RGB } from "./effects";

/**
 * Core render function: given the sequence, fixtures, and current time,
 * compute the RGB value of every pixel of every fixture.
 *
 * Returns a Map<fixtureId, RGB[]> where RGB[] has length === fixture.pixelCount.
 * Pure function — same inputs always produce same output.
 */
export function renderFrame(
  sequence: Sequence,
  fixtures: Fixture[],
  t: number,
  beats?: number[]
): Map<string, RGB[]> {
  const result = new Map<string, RGB[]>();

  for (const fixture of fixtures) {
    // Find all active blocks for this fixture at time t
    const activeBlocks = sequence.blocks.filter(
      (b) => b.trackId === fixture.id && t >= b.start && t < b.start + b.duration
    );

    if (activeBlocks.length === 0) {
      // No active effects — all pixels off
      result.set(fixture.id, Array.from({ length: fixture.pixelCount }, () => [0, 0, 0] as RGB));
      continue;
    }

    // Last-writer-wins: use the block with the latest start time
    const block = activeBlocks.reduce((latest, b) => b.start > latest.start ? b : latest, activeBlocks[0]);

    const effectFn = EFFECT_REGISTRY[block.effectId];
    if (!effectFn) {
      result.set(fixture.id, Array.from({ length: fixture.pixelCount }, () => [0, 0, 0] as RGB));
      continue;
    }

    const pixels = effectFn({ block, fixture, t, beats });
    result.set(fixture.id, pixels);
  }

  return result;
}
