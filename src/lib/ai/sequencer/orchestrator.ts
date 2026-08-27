/**
 * The sequencer orchestrator: batches sections, gets a plan per batch from
 * Layer 1 (through an injectable model caller so the pipeline is testable
 * without an API key), expands plans deterministically, and streams the
 * resulting blocks as AIEvents. Both the real Anthropic provider and the
 * explicit mock run through this exact code path.
 */

import type { AIEvent, GenerateInput, GenerateOptions } from "../provider";
import type { EffectBlock } from "@/lib/timeline/types";
import { salvagePlans } from "./schema";
import type { SectionPlan } from "./schema";
import { prepareSections, loudnessShape } from "./sections";
import type { PlanSection } from "./sections";
import { deriveFixtureGroups } from "./groups";
import { buildPlanPrompt } from "./prompt";
import { expandPlans } from "./expander";

export interface ModelCallResult {
  text: string;
  /** Anthropic stop_reason: "end_turn" | "max_tokens" | "refusal" | ... */
  stopReason: string | null;
}

/** Context handed alongside the prompt — the real caller ignores it; the mock planner uses it. */
export interface PlanBatchMeta {
  batch: PlanSection[];
  groups: ReturnType<typeof deriveFixtureGroups>;
  vibe: GenerateInput["vibe"];
  intensity: GenerateInput["intensity"];
}

export type ModelCaller = (prompt: string, meta: PlanBatchMeta) => Promise<ModelCallResult>;

const SECTIONS_PER_BATCH = 4;
const MAX_TOTAL_BLOCKS = 6000;
const PATCH_BATCH_SIZE = 100;

const INTENSITY_SCALE: Record<GenerateInput["intensity"], number> = {
  subtle: 0.7,
  balanced: 1.0,
  wild: 1.2,
};

export async function* runSequencer(
  input: GenerateInput,
  options: GenerateOptions | undefined,
  callModel: ModelCaller
): AsyncIterable<AIEvent> {
  const sections = prepareSections(input.audio);
  const groups = deriveFixtureGroups(input.fixtures);
  if (groups.length === 0) {
    yield { type: "error", message: "No fixtures to sequence." };
    return;
  }
  if (input.audio.beats.length === 0) {
    yield { type: "error", message: "No beats detected in the audio analysis — re-upload the song." };
    return;
  }

  yield {
    type: "thought",
    text: `Planning ${sections.length} sections (${input.audio.beats.length} beats at ${input.audio.bpm} BPM) across ${groups.length} fixture groups.`,
  };

  // ── Layer 1: plan each batch of sections ──
  const shape = loudnessShape(input.audio);
  const batches: PlanSection[][] = [];
  for (let i = 0; i < sections.length; i += SECTIONS_PER_BATCH) {
    batches.push(sections.slice(i, i + SECTIONS_PER_BATCH));
  }

  const plans: SectionPlan[] = [];
  const planProblems: string[] = [];
  for (let bi = 0; bi < batches.length; bi++) {
    yield {
      type: "progress",
      step: `Planning sections ${batches[bi][0].index + 1}–${batches[bi][batches[bi].length - 1].index + 1} of ${sections.length}...`,
      pct: 5 + Math.round((bi / batches.length) * 55),
    };
    const result = await planBatch(batches[bi], input, options, sections, shape, groups, callModel, planProblems);
    if ("error" in result) {
      yield { type: "error", message: result.error };
      return;
    }
    plans.push(...result.plans);
  }

  if (plans.length === 0) {
    yield {
      type: "error",
      message: `The model returned no usable section plans.${planProblems.length ? ` (${planProblems[0]})` : ""}`,
    };
    return;
  }
  if (planProblems.length > 0) {
    yield { type: "thought", text: `Salvage: ${planProblems.slice(0, 3).join("; ")}` };
  }

  // ── Layer 2: deterministic expansion ──
  yield { type: "progress", step: "Expanding plans into beat-snapped effects...", pct: 65 };

  const { blocks, stats } = expandPlans(plans, sections, input.audio, groups, {
    intensityScale: INTENSITY_SCALE[input.intensity] ?? 1.0,
    maxBlocks: MAX_TOTAL_BLOCKS,
  });

  if (blocks.length === 0) {
    yield { type: "error", message: "Plans expanded to zero effect blocks — the section plans may not match any fixture groups." };
    return;
  }

  if (stats.unknownGroups.length > 0) {
    yield { type: "thought", text: `Ignored unknown group keys from the model: ${stats.unknownGroups.join(", ")}` };
  }
  yield {
    type: "thought",
    text:
      `Expanded ${plans.length} section plans into ${stats.totalBlocks} blocks — ` +
      `${stats.onBeatBlocks} start exactly on detected beats` +
      (stats.thinnedBlocks > 0 ? ` (${stats.thinnedBlocks} accents thinned by the density ceiling)` : "") +
      `.`,
  };

  // ── stream blocks into the editor ──
  for (let i = 0; i < blocks.length; i += PATCH_BATCH_SIZE) {
    yield { type: "patch", patch: { addBlocks: blocks.slice(i, i + PATCH_BATCH_SIZE) } };
    const pct = 70 + Math.round((Math.min(i + PATCH_BATCH_SIZE, blocks.length) / blocks.length) * 28);
    yield { type: "progress", step: `Applying effects (${Math.min(i + PATCH_BATCH_SIZE, blocks.length)}/${blocks.length})...`, pct };
  }

  yield { type: "progress", step: "Done!", pct: 100 };
  yield {
    type: "done",
    summary:
      `Added ${stats.totalBlocks} effects across ${Object.keys(stats.perFixture).length} props ` +
      `(${plans.length} sections, ${Math.round((stats.onBeatBlocks / stats.totalBlocks) * 100)}% on detected beats).`,
  };
}

type BatchResult = { plans: SectionPlan[] } | { error: string };

async function planBatch(
  batch: PlanSection[],
  input: GenerateInput,
  options: GenerateOptions | undefined,
  allSections: PlanSection[],
  shape: number[],
  groups: ReturnType<typeof deriveFixtureGroups>,
  callModel: ModelCaller,
  problems: string[]
): Promise<BatchResult> {
  const prompt = buildPlanPrompt({
    allSections,
    batch,
    groups,
    bpm: input.audio.bpm,
    duration: input.audio.duration,
    loudnessShape: shape,
    style: options?.style,
    vibe: input.vibe,
    intensity: input.intensity,
    refinementPrompt: options?.refinementPrompt,
  });

  let result: ModelCallResult;
  try {
    result = await callModel(prompt, {
      batch,
      groups,
      vibe: input.vibe,
      intensity: input.intensity,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }

  if (result.stopReason === "refusal") {
    return { error: "The model declined to generate this plan. Try a different style or refinement." };
  }
  if (result.stopReason === "max_tokens") {
    // Truncated output. A batch can be split and retried; a single section cannot.
    if (batch.length > 1) {
      const mid = Math.ceil(batch.length / 2);
      const first = await planBatch(batch.slice(0, mid), input, options, allSections, shape, groups, callModel, problems);
      if ("error" in first) return first;
      const second = await planBatch(batch.slice(mid), input, options, allSections, shape, groups, callModel, problems);
      if ("error" in second) return second;
      problems.push(`batch of ${batch.length} sections truncated; retried as two smaller calls`);
      return { plans: [...first.plans, ...second.plans] };
    }
    return {
      error:
        "The model's plan was cut off by the output token limit even for a single section. " +
        "This song's structure may be too complex — try again.",
    };
  }

  const parsed = parseJsonArray(result.text);
  if (parsed === undefined) {
    return { error: "The model returned unparseable JSON for the section plan. Try again." };
  }
  const { plans, report } = salvagePlans(parsed);
  problems.push(...report.problems);
  return { plans };
}

/** Strip fences, parse; on failure salvage the complete top-level objects. */
function parseJsonArray(raw: string): unknown | undefined {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  try {
    return JSON.parse(text);
  } catch {
    const objects = extractBalancedObjects(text);
    return objects.length > 0 ? objects : undefined;
  }
}

/**
 * Pull every balanced top-level {...} out of a possibly-truncated array
 * response — a cut mid-object drops only that object, not the whole batch.
 */
function extractBalancedObjects(text: string): unknown[] {
  const out: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          out.push(JSON.parse(text.slice(start, i + 1)));
        } catch {
          // skip malformed object
        }
        start = -1;
      }
    }
  }
  return out;
}

export type { EffectBlock };
