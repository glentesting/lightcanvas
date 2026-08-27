/**
 * Layer 2: deterministic expansion of section plans into effect blocks.
 *
 * This is where the volume lives: chases, staggers, per-fixture distribution,
 * phrase splitting — all in code. Every block's start is a real detected beat
 * (never an extrapolated grid), and durations are derived from gaps between
 * real beats.
 */

import type { AudioAnalysis } from "@/lib/audio/types";
import type { EffectBlock, EffectParams } from "@/lib/timeline/types";
import { DEFAULT_EFFECT_PARAMS } from "@/lib/timeline/constants";
import type { SectionPlan, GroupPlan } from "./schema";
import type { PlanSection } from "./sections";
import type { SequencerGroup } from "./groups";
import { resolveGroup } from "./groups";

export interface ExpandOptions {
  /** UI intensity scales brightness (block params), not structure */
  intensityScale: number;
  /** hard ceiling on total blocks; accents are thinned uniformly to fit */
  maxBlocks: number;
  /** stable id generator (injectable for deterministic tests) */
  makeId?: () => string;
}

export interface ExpandStats {
  totalBlocks: number;
  /** blocks whose start time is exactly a detected beat */
  onBeatBlocks: number;
  /** accent blocks removed by the density ceiling */
  thinnedBlocks: number;
  perFixture: Record<string, number>;
  unknownGroups: string[];
}

export interface ExpandResult {
  blocks: EffectBlock[];
  stats: ExpandStats;
}

/** Effects that read as short accents; everything else sustains well. */
const ACCENT_DURATION_CAP = 2.0; // seconds
const PHRASE_BARS = 8; // sustained blocks split every 8 downbeats

export function expandPlans(
  plans: SectionPlan[],
  sections: PlanSection[],
  analysis: AudioAnalysis,
  groups: SequencerGroup[],
  options: ExpandOptions
): ExpandResult {
  const makeId = options.makeId ?? (() => crypto.randomUUID());
  const beatSet = new Set(analysis.beats);
  const downbeatSet = new Set(analysis.downbeats);
  const beatIndex = new Map(analysis.beats.map((b, i) => [b, i]));

  const sustained: EffectBlock[] = [];
  const accents: EffectBlock[] = [];
  const unknownGroups = new Set<string>();

  const sectionByIndex = new Map(sections.map((s) => [s.index, s]));

  for (const plan of plans) {
    const section = sectionByIndex.get(plan.section);
    if (!section) continue;
    const nextSection = sectionByIndex.get(plan.section + 1);

    // real beats inside this section
    const beats = analysis.beats.filter((b) => b >= section.startTime && b < section.endTime);
    const sectionEnd = section.endTime;

    for (const gp of plan.groups) {
      const group = resolveGroup(groups, gp.group);
      if (!group) {
        unknownGroups.add(gp.group);
        continue;
      }
      expandGroupPlan(gp, plan, group, beats, sectionEnd, {
        beatIndex,
        downbeatSet,
        intensityScale: options.intensityScale,
        makeId,
        sustained,
        accents,
      });
    }

    // transition into the next section
    if (plan.transition && plan.transition !== "none" && nextSection && beats.length > 0) {
      expandTransition(plan, sections, analysis, groups, {
        beats,
        sectionEnd,
        intensityScale: options.intensityScale,
        makeId,
        accents,
        sustained,
      });
    }
  }

  // density ceiling: thin accents uniformly, never the sustained bed
  let thinnedBlocks = 0;
  let keptAccents = accents;
  const budget = options.maxBlocks - sustained.length;
  if (accents.length > budget && budget > 0) {
    const keepRatio = budget / accents.length;
    keptAccents = accents.filter((_, i) => Math.floor(i * keepRatio) !== Math.floor((i - 1) * keepRatio));
    thinnedBlocks = accents.length - keptAccents.length;
  }

  const blocks = [...sustained, ...keptAccents].sort((a, b) => a.start - b.start);

  const perFixture: Record<string, number> = {};
  let onBeatBlocks = 0;
  for (const b of blocks) {
    perFixture[b.trackId] = (perFixture[b.trackId] ?? 0) + 1;
    if (beatSet.has(b.start)) onBeatBlocks++;
  }

  return {
    blocks,
    stats: {
      totalBlocks: blocks.length,
      onBeatBlocks,
      thinnedBlocks,
      perFixture,
      unknownGroups: [...unknownGroups],
    },
  };
}

interface GroupExpandCtx {
  beatIndex: Map<number, number>;
  downbeatSet: Set<number>;
  intensityScale: number;
  makeId: () => string;
  sustained: EffectBlock[];
  accents: EffectBlock[];
}

function expandGroupPlan(
  gp: GroupPlan,
  plan: SectionPlan,
  group: SequencerGroup,
  beats: number[],
  sectionEnd: number,
  ctx: GroupExpandCtx
): void {
  const fixtures = group.fixtures;
  const n = fixtures.length;
  if (n === 0 || beats.length === 0) return;

  const movement = gp.movement ?? "unison";
  const level = clamp01((gp.intensity ?? 0.8) * plan.energy * ctx.intensityScale);
  const params = (color1: string, color2?: string): EffectParams => ({
    ...DEFAULT_EFFECT_PARAMS,
    color1,
    color2,
    intensity: round3(Math.max(0.15, level)),
    speed: gp.speed ?? DEFAULT_EFFECT_PARAMS.speed,
  });

  const push = (list: EffectBlock[], fixtureId: string, start: number, duration: number, colorFlip = false) => {
    if (duration <= 0.05) return;
    list.push({
      id: ctx.makeId(),
      trackId: fixtureId,
      effectId: gp.effect,
      start: round3(start),
      duration: round3(duration),
      params: colorFlip && gp.color2 ? params(gp.color2, gp.color1) : params(gp.color1, gp.color2),
    });
  };

  if (gp.rhythm === "sustained") {
    // one bed per fixture, split at phrase boundaries (every PHRASE_BARS downbeats)
    const phraseStarts = [beats[0], ...beats.filter(
      (b, i) => i > 0 && ctx.downbeatSet.has(b) && downbeatOrdinal(beats, ctx.downbeatSet, i) % PHRASE_BARS === 0
    )];
    const bounds = [...phraseStarts, sectionEnd];
    for (let f = 0; f < n; f++) {
      for (let p = 0; p < bounds.length - 1; p++) {
        // alternate palette per phrase when a second color exists
        push(ctx.sustained, fixtures[f].id, bounds[p], bounds[p + 1] - bounds[p], p % 2 === 1);
      }
    }
    return;
  }

  // accent rhythms: build the pulse list from real beats
  let pulses: number[];
  switch (gp.rhythm) {
    case "every-beat":
      pulses = beats;
      break;
    case "every-2-beats":
      pulses = beats.filter((_, i) => i % 2 === 0);
      break;
    case "downbeats":
      pulses = beats.filter((b) => ctx.downbeatSet.has(b));
      break;
    case "offbeats": {
      // the backbeat: two beats after each downbeat (the "3" in 4/4)
      pulses = beats.filter((b) => {
        const gi = ctx.beatIndex.get(b);
        return gi !== undefined && gi % 4 === 2;
      });
      break;
    }
    default:
      pulses = beats;
  }
  if (pulses.length === 0) pulses = beats.filter((b) => ctx.downbeatSet.has(b));
  if (pulses.length === 0) pulses = [beats[0]];

  const gapAfter = (k: number) =>
    Math.min((k + 1 < pulses.length ? pulses[k + 1] : sectionEnd) - pulses[k], ACCENT_DURATION_CAP);

  switch (movement) {
    case "unison":
      for (let k = 0; k < pulses.length; k++) {
        for (let f = 0; f < n; f++) {
          push(ctx.accents, fixtures[f].id, pulses[k], gapAfter(k), k % 2 === 1);
        }
      }
      break;
    case "left-to-right":
    case "right-to-left": {
      // a wave-front wide enough that the sweep crosses the group about once
      // per bar (4 pulses) — one-fixture-per-beat reads sluggish on 8-prop runs
      const front = Math.max(1, Math.ceil(n / 4));
      for (let k = 0; k < pulses.length; k++) {
        // let the accent ring for two pulse gaps so the chase overlaps a little
        const dur = Math.min(gapAfter(k) * 2, ACCENT_DURATION_CAP);
        for (let w = 0; w < front; w++) {
          const pos = (k * front + w) % n;
          const idx = movement === "left-to-right" ? pos : n - 1 - pos;
          push(ctx.accents, fixtures[idx].id, pulses[k], dur);
        }
      }
      break;
    }
    case "alternate":
      for (let k = 0; k < pulses.length; k++) {
        for (let f = k % 2; f < n; f += 2) {
          push(ctx.accents, fixtures[f].id, pulses[k], gapAfter(k), k % 2 === 1);
        }
      }
      break;
    case "center-out": {
      const mid = (n - 1) / 2;
      const maxDist = Math.ceil(n / 2);
      for (let k = 0; k < pulses.length; k++) {
        const d = k % maxDist;
        const lo = Math.floor(mid - d);
        const hi = Math.ceil(mid + d);
        push(ctx.accents, fixtures[Math.max(0, lo)].id, pulses[k], gapAfter(k));
        if (hi !== Math.max(0, lo) && hi < n) push(ctx.accents, fixtures[hi].id, pulses[k], gapAfter(k));
      }
      break;
    }
    case "stagger":
      // fixture f runs the same pulse pattern shifted f pulses later — still on real beats
      for (let f = 0; f < n; f++) {
        for (let k = f; k < pulses.length; k += Math.max(1, Math.floor(n / 2))) {
          push(ctx.accents, fixtures[f].id, pulses[k], gapAfter(k), f % 2 === 1);
        }
      }
      break;
  }
}

interface TransitionCtx {
  beats: number[];
  sectionEnd: number;
  intensityScale: number;
  makeId: () => string;
  accents: EffectBlock[];
  sustained: EffectBlock[];
}

function expandTransition(
  plan: SectionPlan,
  _sections: PlanSection[],
  analysis: AudioAnalysis,
  groups: SequencerGroup[],
  ctx: TransitionCtx
): void {
  const lastBeats = ctx.beats.slice(-4);
  if (lastBeats.length === 0) return;
  const activeGroups = plan.groups
    .map((gp) => resolveGroup(groups, gp.group))
    .filter((g): g is SequencerGroup => !!g);
  const allFixtures = activeGroups.flatMap((g) => g.fixtures);
  if (allFixtures.length === 0) return;

  const mk = (fixtureId: string, effectId: EffectBlock["effectId"], start: number, duration: number, color1: string) => {
    ctx.accents.push({
      id: ctx.makeId(),
      trackId: fixtureId,
      effectId,
      start: round3(start),
      duration: round3(duration),
      params: {
        ...DEFAULT_EFFECT_PARAMS,
        color1,
        intensity: round3(clamp01(plan.energy * ctx.intensityScale)),
        speed: 2,
      },
    });
  };

  switch (plan.transition) {
    case "flash": {
      const t = lastBeats[lastBeats.length - 1];
      for (const f of allFixtures) mk(f.id, "strobe", t, Math.min(ctx.sectionEnd - t, 0.8), "#ffffff");
      break;
    }
    case "sweep": {
      // one chase across everything over the last 4 beats
      for (let i = 0; i < allFixtures.length; i++) {
        const beat = lastBeats[Math.floor((i / allFixtures.length) * lastBeats.length)];
        mk(allFixtures[i].id, "chase", beat, Math.min(ctx.sectionEnd - beat, 1.5), plan.groups[0].color1);
      }
      break;
    }
    case "blackout": {
      // truncate everything so the last beat-gap of the section goes dark
      const cut = lastBeats[lastBeats.length - 1];
      for (const list of [ctx.sustained, ctx.accents]) {
        for (const b of list) {
          if (b.start < cut && b.start + b.duration > cut) {
            b.duration = round3(Math.max(0.05, cut - b.start));
          }
        }
      }
      break;
    }
  }
}

/** ordinal of the downbeat at beats[i] among this section's downbeats */
function downbeatOrdinal(beats: number[], downbeatSet: Set<number>, i: number): number {
  let ord = 0;
  for (let k = 0; k <= i; k++) if (downbeatSet.has(beats[k])) ord++;
  return ord - 1;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round3 = (n: number) => Math.round(n * 1000) / 1000;
