import type { EffectBlock } from "@/lib/timeline/types";
import type { Fixture } from "@/lib/fixtures/types";

export type RGB = [number, number, number];

export interface EffectInput {
  block: EffectBlock;
  fixture: Fixture;
  t: number; // absolute time in song (seconds)
  beats?: number[];
}

export type EffectFn = (input: EffectInput) => RGB[];
