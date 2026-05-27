import { z } from "zod";
import type { AIProvider, AIEvent, GenerateInput, GenerateOptions } from "./provider";
import type { EffectBlock, EffectId } from "@/lib/timeline/types";
import { DEFAULT_EFFECT_PARAMS } from "@/lib/timeline/constants";
import { AI_STYLES } from "./styles";

const VALID_EFFECTS: EffectId[] = [
  "twinkle", "chase", "fade", "strobe", "sparkle",
  "wave", "pulse", "wash", "meteor", "firework",
];

const MODEL_PRIMARY = "claude-sonnet-4-6";
const MODEL_FAST = "claude-haiku-4-5";
void MODEL_FAST;

const effectBlockSchema = z.object({
  fixtureId: z.string(),
  effectId: z.enum([
    "twinkle", "chase", "fade", "strobe", "sparkle",
    "wave", "pulse", "wash", "meteor", "firework",
  ]),
  start: z.number().min(0),
  duration: z.number().min(0.1),
  params: z.object({
    color1: z.string().optional(),
    color2: z.string().optional(),
    intensity: z.number().min(0).max(1).optional(),
    speed: z.number().min(0).max(10).optional(),
    easing: z.enum(["linear", "ease-in", "ease-out", "ease-in-out"]).optional(),
  }).optional(),
});

const responseSchema = z.array(effectBlockSchema);

function buildPrompt(input: GenerateInput, options?: GenerateOptions): string {
  const { audio, fixtures, vibe } = input;

  // Find style preset hint
  const stylePreset = AI_STYLES.find((s) => s.id === (options?.style || vibe));
  const styleHint = stylePreset?.promptHint || "Create a balanced, visually appealing light show.";

  // Sample beats (first 20)
  const sampleBeats = audio.beats.slice(0, 20).map((b) => b.toFixed(3)).join(", ");

  // Format fixtures
  const fixtureList = fixtures
    .map((f) => `- ID: "${f.id}", Name: "${f.name}", Type: ${f.kind}, Pixels: ${f.pixelCount}`)
    .join("\n");

  // Section info
  const sectionInfo = (options?.sections || audio.sections || [])
    .map((s) => `  ${s.label}: ${s.startTime.toFixed(1)}s - ${s.endTime.toFixed(1)}s (energy: ${s.avgEnergy.toFixed(2)})`)
    .join("\n");

  // Intensity mapping
  const intensityMap: Record<string, number> = { subtle: 25, balanced: 50, wild: 90 };
  const intensityLevel = options?.intensity ?? intensityMap[input.intensity] ?? 50;

  // Refinement context
  const refinementBlock = options?.refinementPrompt
    ? `\nREFINEMENT REQUEST: ${options.refinementPrompt}\nAdjust the generated blocks according to this request.`
    : "";

  const existingBlocksInfo = options?.existingBlocks && options.existingBlocks.length > 0
    ? `\nEXISTING BLOCKS (for context, do NOT include these in your output — generate NEW blocks only):\n${JSON.stringify(options.existingBlocks.slice(0, 20), null, 0)}`
    : "";

  return `You are a Christmas light show sequencer AI. Generate effect blocks for a synchronized light show.

Song Information:
- Duration: ${audio.duration.toFixed(1)}s
- BPM: ${audio.bpm}
- Beat count: ${audio.beats.length}
- Sample beats (first 20): [${sampleBeats}]
${sectionInfo ? `- Sections:\n${sectionInfo}` : ""}

Fixtures:
${fixtureList}

Style: ${stylePreset?.name || vibe}
Style guidance: ${styleHint}
Intensity: ${intensityLevel}/100
${refinementBlock}
${existingBlocksInfo}

Generate a JSON array of effect blocks. Each block must be:
{
  "fixtureId": "[exact fixture ID from the list above]",
  "effectId": "[one of: ${VALID_EFFECTS.join(", ")}]",
  "start": [start time in seconds, aligned to beats],
  "duration": [duration in seconds],
  "params": {
    "color1": "#hex",
    "color2": "#hex or omit",
    "intensity": [0.0 to 1.0],
    "speed": [0.1 to 5.0],
    "easing": "linear"
  }
}

Rules:
- Use ONLY fixture IDs from the list above — copy them EXACTLY
- Effects should align with beats where possible (beat interval: ${(60 / audio.bpm).toFixed(3)}s)
- Vary effects across fixtures — don't put the same effect on everything
- Create layered compositions: base layer (long wash/fade), accent layer (beat hits), transition layer
- Generate at least ${Math.max(10, fixtures.length * 3)} blocks for a full show
- Keep all start times and durations within 0 to ${audio.duration.toFixed(1)} seconds
- Higher intensity means more effects, faster speeds, more strobes and chases
- Lower intensity means fewer effects, slower fades and washes, more empty space

Output ONLY the JSON array. No explanation, no markdown fences, no comments.`;
}

export class AnthropicAIProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async *generateFromMusic(
    input: GenerateInput,
    options?: GenerateOptions
  ): AsyncIterable<AIEvent> {
    yield { type: "progress", step: "Building prompt...", pct: 10 };

    const prompt = buildPrompt(input, options);

    yield { type: "progress", step: "Calling Claude AI...", pct: 20 };
    yield {
      type: "thought",
      text: `Analyzing ${input.audio.beats.length} beats at ${input.audio.bpm} BPM across ${input.fixtures.length} fixtures.`,
    };

    let rawText: string;
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL_PRIMARY,
          max_tokens: 8192,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "Unknown error");
        if (response.status === 429) {
          yield { type: "error", message: "Rate limited by AI service. Please wait a moment and try again." };
          return;
        }
        if (response.status === 401) {
          yield { type: "error", message: "AI service authentication failed. Check your API key." };
          return;
        }
        yield { type: "error", message: `AI service error (${response.status}): ${errorBody.slice(0, 200)}` };
        return;
      }

      const data = await response.json();
      rawText = data.content?.[0]?.text || "";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
        yield { type: "error", message: "AI request timed out. Try again with fewer fixtures or a shorter song." };
      } else {
        yield { type: "error", message: `Failed to reach AI service: ${msg}` };
      }
      return;
    }

    yield { type: "progress", step: "Parsing AI response...", pct: 70 };

    // Extract JSON from response — handle markdown fences if present
    let jsonText = rawText.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      yield { type: "error", message: "AI returned invalid JSON. Please try again." };
      return;
    }

    yield { type: "progress", step: "Validating effect blocks...", pct: 80 };

    const validated = responseSchema.safeParse(parsed);
    if (!validated.success) {
      // Try to salvage individual blocks
      const blocks: EffectBlock[] = [];
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const single = effectBlockSchema.safeParse(item);
          if (single.success) {
            blocks.push(toEffectBlock(single.data, input));
          }
        }
      }
      if (blocks.length === 0) {
        yield { type: "error", message: "AI response did not contain valid effect blocks. Please try again." };
        return;
      }

      yield {
        type: "thought",
        text: `Recovered ${blocks.length} valid blocks from partially invalid response.`,
      };

      yield { type: "progress", step: "Applying effects...", pct: 90 };
      const batchSize = 4;
      for (let i = 0; i < blocks.length; i += batchSize) {
        yield { type: "patch", patch: { addBlocks: blocks.slice(i, i + batchSize) } };
      }

      yield { type: "progress", step: "Done!", pct: 100 };
      yield {
        type: "done",
        summary: `Added ${blocks.length} AI-generated effects across ${new Set(blocks.map((b) => b.trackId)).size} props.`,
      };
      return;
    }

    // Convert validated data to EffectBlocks
    const validFixtureIds = new Set(input.fixtures.map((f) => f.id));
    const blocks: EffectBlock[] = validated.data
      .filter((b) => validFixtureIds.has(b.fixtureId))
      .filter((b) => b.start >= 0 && b.start + b.duration <= input.audio.duration + 1)
      .map((b) => toEffectBlock(b, input));

    if (blocks.length === 0) {
      yield { type: "error", message: "AI generated blocks but none matched your fixtures. Please try again." };
      return;
    }

    yield {
      type: "thought",
      text: `Generated ${blocks.length} effects using ${new Set(blocks.map((b) => b.effectId)).size} different effect types.`,
    };

    yield { type: "progress", step: "Applying effects...", pct: 90 };

    const batchSize = 4;
    for (let i = 0; i < blocks.length; i += batchSize) {
      yield { type: "patch", patch: { addBlocks: blocks.slice(i, i + batchSize) } };
    }

    yield { type: "progress", step: "Done!", pct: 100 };
    yield {
      type: "done",
      summary: `Added ${blocks.length} AI-generated effects across ${new Set(blocks.map((b) => b.trackId)).size} props.`,
    };
  }
}

function toEffectBlock(
  raw: z.infer<typeof effectBlockSchema>,
  _input: GenerateInput
): EffectBlock {
  return {
    id: crypto.randomUUID(),
    trackId: raw.fixtureId,
    effectId: raw.effectId,
    start: Math.round(raw.start * 1000) / 1000,
    duration: Math.round(raw.duration * 1000) / 1000,
    params: {
      ...DEFAULT_EFFECT_PARAMS,
      color1: raw.params?.color1 || DEFAULT_EFFECT_PARAMS.color1,
      color2: raw.params?.color2,
      intensity: raw.params?.intensity ?? DEFAULT_EFFECT_PARAMS.intensity,
      speed: raw.params?.speed ?? DEFAULT_EFFECT_PARAMS.speed,
      easing: raw.params?.easing ?? DEFAULT_EFFECT_PARAMS.easing,
    },
  };
}
