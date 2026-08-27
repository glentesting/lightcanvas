/**
 * Explicit mock provider — dev/testing only, enabled by AI_USE_MOCK=1.
 * It is never a silent fallback: getAIProvider() throws without a key, and
 * this provider announces itself with a {type:"mode", mock:true} event that
 * the UI renders as a banner.
 *
 * The mock replaces ONLY the model call: it emits deterministic section-plan
 * JSON, which then flows through the exact same parsing, validation,
 * expansion, and streaming code as the real provider — so the whole pipeline
 * minus the API round trip is exercised.
 */

import type { AIProvider, AIEvent, GenerateInput, GenerateOptions } from "./provider";
import { runSequencer } from "./sequencer/orchestrator";
import type { ModelCaller, PlanBatchMeta } from "./sequencer/orchestrator";
import type { SectionPlan, GroupPlan } from "./sequencer/schema";
import { MOVEMENTS } from "./sequencer/schema";

const VIBE_COLORS: Record<string, Array<[string, string?]>> = {
  classic: [["#cc0000", "#00aa33"], ["#fffaf0", "#ffcc44"], ["#00aa33", "#cc0000"], ["#ffcc44"]],
  jazz: [["#2244cc", "#ffcc44"], ["#fffaf0"], ["#ffcc44", "#2244cc"]],
  edm: [["#00ffff", "#ff00cc"], ["#ffffff"], ["#ff00cc", "#8800ff"], ["#8800ff", "#00ffff"]],
  cinematic: [["#fff2d0", "#99bbff"], ["#99bbff"], ["#ffb060", "#fff2d0"]],
  whimsical: [["#ff6699", "#66ccff"], ["#aaff66", "#ffee66"], ["#66ccff", "#ff6699"]],
};

const SUSTAIN_EFFECTS = ["wash", "fade", "wave", "twinkle"] as const;
const ACCENT_EFFECTS = ["pulse", "chase", "sparkle", "meteor"] as const;

/** Deterministic "musical direction": energy from real loudness, layers by section index. */
export const mockPlanBatch: ModelCaller = async (_prompt: string, meta: PlanBatchMeta) => {
  const palette = VIBE_COLORS[meta.vibe] ?? VIBE_COLORS.classic;
  const maxLayers = meta.intensity === "subtle" ? 2 : meta.intensity === "wild" ? 4 : 3;

  const plans: SectionPlan[] = meta.batch.map((section) => {
    const energy = Math.max(0.3, Math.min(1, section.avgLoudness + 0.15));
    const busy = section.onsetDensity > 2 || section.label === "chorus";
    const quiet = section.label === "intro" || section.label === "outro";
    // typical plan shape: a sustained bed plus layered accents; choruses layer deepest
    const layerCount = Math.min(
      meta.groups.length,
      quiet ? 2 : section.label === "chorus" ? maxLayers + 1 : maxLayers
    );

    const groups: GroupPlan[] = [];
    for (let l = 0; l < layerCount; l++) {
      const group = meta.groups[(section.index + l) % meta.groups.length];
      const [color1, color2] = palette[(section.index + l) % palette.length];
      const accent = l > 0 && !quiet;
      // big groups carry dense movements; chases read best on mid-size runs
      const accentMovement =
        group.fixtures.length >= 6
          ? (["alternate", "unison", "stagger"] as const)[(section.index + l) % 3]
          : group.fixtures.length >= 3
            ? (["left-to-right", "center-out", "unison"] as const)[(section.index + l) % 3]
            : "unison";
      groups.push({
        group: group.key,
        effect: accent
          ? ACCENT_EFFECTS[(section.index + l) % ACCENT_EFFECTS.length]
          : SUSTAIN_EFFECTS[(section.index + l) % SUSTAIN_EFFECTS.length],
        rhythm: accent ? (busy ? "every-beat" : "downbeats") : "sustained",
        movement: accent ? accentMovement : MOVEMENTS[section.index % MOVEMENTS.length],
        color1,
        color2,
        intensity: Math.round(energy * 100) / 100,
      });
    }

    return {
      section: section.index,
      energy,
      groups,
      transition: section.label === "verse" && busy ? "flash" : "none",
    };
  });

  return { text: JSON.stringify(plans), stopReason: "end_turn" };
};

export class MockAIProvider implements AIProvider {
  async *generateFromMusic(input: GenerateInput, options?: GenerateOptions): AsyncIterable<AIEvent> {
    yield {
      type: "mode",
      mock: true,
      message: "Mock mode (AI_USE_MOCK=1) — deterministic placeholder plans, not real AI.",
    };
    yield* runSequencer(input, options, mockPlanBatch);
  }
}
