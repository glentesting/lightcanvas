import type { AIProvider, AIEvent, GenerateInput } from "./provider";
import type { EffectBlock, EffectId } from "@/lib/timeline/types";
import { DEFAULT_EFFECT_PARAMS } from "@/lib/timeline/constants";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Rules for which effects suit which fixture roles
const ROLE_EFFECTS: Record<string, EffectId[]> = {
  roofline: ["chase", "wave", "wash", "twinkle"],
  "mega-tree": ["firework", "pulse", "meteor", "sparkle"],
  "mini-tree": ["twinkle", "sparkle", "pulse"],
  arch: ["chase", "wave", "pulse"],
  bush: ["twinkle", "sparkle", "wash"],
  "window-outline": ["fade", "twinkle", "strobe"],
};

const INTENSITY_MULTIPLIER = { subtle: 0.5, balanced: 0.75, wild: 1.0 };

const COLORS: Record<string, string[]> = {
  classic: ["#ff0000", "#00ff00", "#ffffff", "#ffaa00"],
  jazz: ["#4488ff", "#ff44aa", "#44ffaa", "#ffff44"],
  edm: ["#ff00ff", "#00ffff", "#ff0088", "#8800ff"],
  cinematic: ["#2244ff", "#ffffff", "#4488ff", "#001166"],
  whimsical: ["#ff88cc", "#88ffcc", "#ffcc88", "#cc88ff"],
};

export class MockAIProvider implements AIProvider {
  async *generateFromMusic(input: GenerateInput): AsyncIterable<AIEvent> {
    const { audio, fixtures, vibe, intensity } = input;

    yield { type: "progress", step: "Listening to song...", pct: 10 };
    await sleep(800);

    yield { type: "progress", step: "Mapping beats to props...", pct: 30 };
    await sleep(700);

    yield {
      type: "thought",
      text: `Detected ${audio.beats.length} beats at ${audio.bpm} BPM. Building ${vibe} patterns across ${fixtures.length} props with ${intensity} intensity.`,
    };
    await sleep(600);

    yield { type: "progress", step: "Composing effect blocks...", pct: 55 };
    await sleep(500);

    // Generate effect blocks
    const blocks = composeFromBeats(input);

    yield { type: "progress", step: "Applying effects...", pct: 75 };
    await sleep(300);

    // Stream blocks in small batches for the "streamed feel"
    const batchSize = 4;
    for (let i = 0; i < blocks.length; i += batchSize) {
      const batch = blocks.slice(i, i + batchSize);
      yield { type: "patch", patch: { addBlocks: batch } };
      await sleep(60);
    }

    yield { type: "progress", step: "Finalizing...", pct: 100 };
    await sleep(200);

    yield {
      type: "done",
      summary: `Added ${blocks.length} effects across ${new Set(blocks.map((b) => b.trackId)).size} props.`,
    };
  }
}

/**
 * Compose a dense, layered, professional light show.
 *
 * Design philosophy: A real show has MANY overlapping effects across ALL props
 * simultaneously, with constant variation. Every beat should have something
 * happening on multiple props. Effects overlap, layer, and transition — never
 * just one thing at a time. This should look like something a professional
 * spent hours programming by hand.
 */
function composeFromBeats(input: GenerateInput): EffectBlock[] {
  const { audio, fixtures, vibe, intensity } = input;
  const blocks: EffectBlock[] = [];
  const colors = COLORS[vibe] || COLORS.classic;
  const mult = INTENSITY_MULTIPLIER[intensity];
  const beats = audio.beats;
  const downbeats = audio.downbeats.length > 0 ? audio.downbeats : beats.filter((_, i) => i % 4 === 0);
  const duration = audio.duration;

  // Compute energy curve from loudness (normalized 0-1)
  const energyAt = (t: number): number => {
    if (audio.loudness.length === 0) return 0.6;
    const nearest = audio.loudness.reduce((best, l) => Math.abs(l.t - t) < Math.abs(best.t - t) ? l : best);
    return Math.min(1, nearest.v / 0.15);
  };

  // For each fixture, generate a dense, varied sequence
  for (const fixture of fixtures) {
    const fxPool = ROLE_EFFECTS[fixture.kind] || ["twinkle", "chase", "fade"];

    // Layer 1: Base layer — long sweeping effects that span 4-16 beats
    let cursor = 0;
    while (cursor < duration) {
      const energy = energyAt(cursor);
      // Duration: 4-16 beats worth, shorter when energy is high (more transitions)
      const beatLen = 60 / audio.bpm;
      const spanBeats = energy > 0.7 ? 3 + rand(cursor) * 5 : 6 + rand(cursor + 1) * 12;
      const blockDur = Math.min(spanBeats * beatLen, duration - cursor);

      if (blockDur < 0.5) { cursor += blockDur; continue; }

      const fx = pickWeighted(fxPool, cursor, energy);
      const color = colors[Math.floor(rand(cursor + 2) * colors.length)];
      const color2 = rand(cursor + 3) > 0.5 ? colors[Math.floor(rand(cursor + 4) * colors.length)] : undefined;

      blocks.push({
        id: crypto.randomUUID(),
        trackId: fixture.id,
        effectId: fx,
        start: snap(cursor, beats),
        duration: Math.round(blockDur * 100) / 100,
        params: {
          ...DEFAULT_EFFECT_PARAMS,
          color1: color,
          color2,
          intensity: mult * (0.5 + energy * 0.5),
          speed: baseSpeed(vibe) * (0.7 + energy * 0.8),
        },
      });

      // Advance cursor — small overlap with next block for smooth transitions
      cursor += blockDur * (0.85 + rand(cursor + 5) * 0.1);
    }

    // Layer 2: Accent hits — short punchy effects on strong beats
    const accentChance = fixture.kind === "mega-tree" ? 0.6 : fixture.kind === "roofline" ? 0.45 : 0.3;
    for (let i = 0; i < downbeats.length; i++) {
      if (rand(downbeats[i] + fixture.id.charCodeAt(0)) > accentChance) continue;
      const energy = energyAt(downbeats[i]);
      if (energy < 0.4) continue; // only accent on energetic moments

      const accentFx: EffectId = energy > 0.8
        ? (["strobe", "firework", "meteor"] as EffectId[])[Math.floor(rand(downbeats[i] + 10) * 3)]
        : (["sparkle", "pulse", "chase"] as EffectId[])[Math.floor(rand(downbeats[i] + 11) * 3)];

      const accentDur = 0.2 + rand(downbeats[i] + 12) * 1.5; // 0.2 - 1.7 seconds
      blocks.push({
        id: crypto.randomUUID(),
        trackId: fixture.id,
        effectId: accentFx,
        start: downbeats[i],
        duration: Math.round(accentDur * 100) / 100,
        params: {
          ...DEFAULT_EFFECT_PARAMS,
          color1: "#ffffff", // accents often flash white
          intensity: mult * 0.9,
          speed: 2 + rand(downbeats[i] + 13) * 2,
        },
      });
    }

    // Layer 3: Transition effects at section boundaries (every ~20s)
    const transitionInterval = 15 + rand(fixture.id.charCodeAt(1) || 0) * 10;
    for (let t = transitionInterval; t < duration - 2; t += transitionInterval) {
      const nearestBeat = beats.reduce((best, b) => Math.abs(b - t) < Math.abs(best - t) ? b : best, beats[0]);
      blocks.push({
        id: crypto.randomUUID(),
        trackId: fixture.id,
        effectId: "fade",
        start: nearestBeat,
        duration: 1.5 + rand(nearestBeat + 20) * 2,
        params: {
          ...DEFAULT_EFFECT_PARAMS,
          color1: colors[Math.floor(rand(nearestBeat + 21) * colors.length)],
          intensity: mult * 0.7,
          speed: 0.8,
          easing: "ease-in-out",
        },
      });
    }
  }

  return blocks;
}

// Pick an effect weighted by energy — high energy favors chase/strobe/firework, low favors twinkle/fade/wash
function pickWeighted(pool: EffectId[], seed: number, energy: number): EffectId {
  const highEnergy: EffectId[] = ["chase", "strobe", "firework", "meteor", "pulse"];
  const lowEnergy: EffectId[] = ["twinkle", "fade", "wash", "sparkle", "wave"];

  if (energy > 0.7 && rand(seed + 50) > 0.3) {
    const candidates = pool.filter((e) => highEnergy.includes(e));
    if (candidates.length > 0) return candidates[Math.floor(rand(seed + 51) * candidates.length)];
  }
  if (energy < 0.4 && rand(seed + 52) > 0.3) {
    const candidates = pool.filter((e) => lowEnergy.includes(e));
    if (candidates.length > 0) return candidates[Math.floor(rand(seed + 53) * candidates.length)];
  }
  return pool[Math.floor(rand(seed + 54) * pool.length)];
}

function baseSpeed(vibe: string): number {
  switch (vibe) {
    case "edm": return 1.8;
    case "jazz": return 0.6;
    case "cinematic": return 0.8;
    case "whimsical": return 1.2;
    default: return 1.0;
  }
}

// Snap a time to the nearest beat within 80ms
function snap(t: number, beats: number[]): number {
  if (beats.length === 0) return Math.round(t * 100) / 100;
  let best = beats[0], bestD = Math.abs(t - beats[0]);
  for (const b of beats) {
    const d = Math.abs(t - b);
    if (d < bestD) { bestD = d; best = b; }
  }
  return bestD < 0.08 ? best : Math.round(t * 100) / 100;
}

// Deterministic pseudo-random
function rand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
