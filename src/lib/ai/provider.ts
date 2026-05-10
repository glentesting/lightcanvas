import type { EffectBlock } from "@/lib/timeline/types";
import type { AudioAnalysis, AudioSection } from "@/lib/audio/types";
import type { Fixture } from "@/lib/fixtures/types";

export interface ProjectPatch {
  addBlocks?: EffectBlock[];
  removeBlockIds?: string[];
  updateBlocks?: Array<{ id: string; patch: Partial<EffectBlock> }>;
}

export type AIEvent =
  | { type: "progress"; step: string; pct: number }
  | { type: "thought"; text: string }
  | { type: "patch"; patch: ProjectPatch }
  | { type: "done"; summary: string }
  | { type: "error"; message: string };

export interface GenerateInput {
  audio: AudioAnalysis;
  fixtures: Fixture[];
  vibe: "classic" | "jazz" | "edm" | "cinematic" | "whimsical";
  intensity: "subtle" | "balanced" | "wild";
}

export interface GenerateOptions {
  style?: string;
  intensity?: number;
  refinementPrompt?: string;
  existingBlocks?: EffectBlock[];
  sections?: AudioSection[];
}

export interface AIProvider {
  generateFromMusic(input: GenerateInput, options?: GenerateOptions): AsyncIterable<AIEvent>;
}
