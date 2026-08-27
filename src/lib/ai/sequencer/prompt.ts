/**
 * Layer 1 prompt: asks the model for musical direction per section, as strict
 * JSON section plans. A batch covers a handful of sections; the whole-song
 * context (energy shape, section table) is identical across batches so the
 * model sees the full arc every time.
 */

import type { PlanSection } from "./sections";
import type { SequencerGroup } from "./groups";
import { PLAN_EFFECTS, RHYTHMS, MOVEMENTS, TRANSITIONS } from "./schema";
import { AI_STYLES } from "../styles";

export interface PlanPromptInput {
  allSections: PlanSection[];
  batch: PlanSection[];
  groups: SequencerGroup[];
  bpm: number;
  duration: number;
  loudnessShape: number[];
  style?: string;
  vibe: string;
  intensity: "subtle" | "balanced" | "wild";
  refinementPrompt?: string;
}

const VIBE_PALETTES: Record<string, string> = {
  classic: "#cc0000 red, #00aa33 green, #fffaf0 warm white, #ffcc44 gold",
  jazz: "#2244cc blue, #ffcc44 gold, #fffaf0 warm white",
  edm: "#00ffff cyan, #ff00cc magenta, #ffffff white, #8800ff violet",
  cinematic: "#fff2d0 warm white, #99bbff moonlight blue, #ffb060 amber",
  whimsical: "#ff6699 pink, #66ccff sky blue, #aaff66 lime, #ffee66 lemon",
};

export function buildPlanPrompt(input: PlanPromptInput): string {
  const stylePreset = AI_STYLES.find((s) => s.id === input.style);
  const palette = VIBE_PALETTES[input.vibe] ?? VIBE_PALETTES.classic;

  const groupTable = input.groups
    .map(
      (g) =>
        `- "${g.key}": ${g.label} — ${g.fixtures.length} fixture${g.fixtures.length !== 1 ? "s" : ""}, ` +
        `${g.fixtures.reduce((s, f) => s + f.pixelCount, 0)} pixels total`
    )
    .join("\n");

  const sectionRow = (s: PlanSection) =>
    `  #${s.index} ${s.label}: ${s.startTime}–${s.endTime}s, ${s.beatCount} beats (${s.downbeatCount} bars), ` +
    `loudness avg ${s.avgLoudness} peak ${s.peakLoudness}, onsets/s ${s.onsetDensity}` +
    (s.avgBass !== undefined ? `, bass ${s.avgBass}, highs ${s.avgHigh}` : "");

  const allRows = input.allSections.map(sectionRow).join("\n");
  const batchIdxs = input.batch.map((s) => s.index).join(", ");

  return `You are the musical director for a synchronized Christmas light show. You decide WHAT each part of the display does in each section of the song; deterministic code will expand your plan into hundreds of beat-accurate effect blocks — you never emit individual effects.

SONG: ${input.duration.toFixed(1)}s at ${input.bpm} BPM.
Loudness shape (${input.loudnessShape.length} equal slices, 0–1): [${input.loudnessShape.join(", ")}]

SECTIONS (full song, for context):
${allRows}

DISPLAY GROUPS:
${groupTable}

STYLE: ${stylePreset ? `${stylePreset.name} — ${stylePreset.promptHint}` : "balanced and musical"}
PALETTE (${input.vibe}): ${palette}
USER INTENSITY: ${input.intensity} (subtle = restraint and dark space, wild = maximum motion)
${input.refinementPrompt ? `\nREFINEMENT REQUEST (this regenerates the show — apply it everywhere it makes sense): ${input.refinementPrompt}\n` : ""}
TASK: Return a plan for sections ${batchIdxs} ONLY, as a JSON array with one object per section:

{
  "section": <index>,
  "energy": <0-1, how hard the lights push — follow the loudness data>,
  "groups": [
    {
      "group": "<key from DISPLAY GROUPS>",
      "effect": "<${PLAN_EFFECTS.join(" | ")}>",
      "rhythm": "<${RHYTHMS.join(" | ")}>",
      "movement": "<${MOVEMENTS.join(" | ")}>",
      "color1": "#rrggbb",
      "color2": "#rrggbb (optional)",
      "intensity": <0-1>,
      "speed": <0.1-5, optional>
    }
  ],
  "transition": "<${TRANSITIONS.join(" | ")}> — the moment INTO the next section"
}

Musical judgment to apply:
- Layer: quiet sections get 1–2 sustained groups; loud choruses layer 3–5 groups — one or two sustained beds plus at least two accent layers (every-beat or downbeats). In peak moments, multi-fixture groups (mini-trees, arches, stakes) hit hardest with alternate or unison accents.
- Contrast: verses and choruses must look different (different groups active, different rhythm density). A chorus repeat can rhyme with the first chorus.
- Rhythm follows the music: high onset density and bass → every-beat or downbeats accents; smooth quiet passages → sustained.
- Movement: chases (left-to-right, center-out, stagger) belong on multi-fixture groups (mini-trees, arches, stakes). unison suits the roofline and single props.
- "downbeats" rhythm = one accent per bar; use it when every-beat would be frantic.
- Use "blackout" transitions sparingly, right before a big chorus. Use "flash" for hard drops.
- Groups you omit from a section stay DARK — silence is a tool, especially at ${input.intensity === "subtle" ? "this subtle intensity: leave most groups dark most of the time" : "intros and bridges"}.

Output ONLY the JSON array for sections ${batchIdxs}. No markdown fences, no commentary.`;
}
