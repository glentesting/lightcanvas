/**
 * Section preparation for the planner. Fixes the input starvation the audit
 * called out: the full analysis (sections, loudness envelope, downbeats,
 * onset density, spectral features) is condensed into per-section musical
 * stats that all reach the model — instead of the first 20 beat timestamps.
 */

import type { AudioAnalysis, AudioSection } from "@/lib/audio/types";

export interface PlanSection {
  index: number;
  label: string;
  startTime: number;
  endTime: number;
  /** real detected beats inside [startTime, endTime) */
  beatCount: number;
  downbeatCount: number;
  /** 0–1 relative to the loudest moment in the song */
  avgLoudness: number;
  peakLoudness: number;
  /** onsets per second — how busy the section is */
  onsetDensity: number;
  /** 0–1 per-beat spectral means, when available */
  avgBass?: number;
  avgHigh?: number;
}

const MIN_SECTION_SEC = 6;
const MAX_SECTION_SEC = 32;
const MAX_SECTIONS = 24;

/**
 * Normalize detected sections into planner sections: merge slivers, cap the
 * count, and attach the musical stats each plan decision needs. When the
 * analysis carries no sections at all, synthesize phrase-length sections from
 * the downbeat grid so the planner still gets structure.
 */
export function prepareSections(analysis: AudioAnalysis): PlanSection[] {
  let raw: Array<Pick<AudioSection, "label" | "startTime" | "endTime">> =
    (analysis.sections ?? []).map((s) => ({ ...s }));

  if (raw.length === 0) {
    raw = synthesizeSections(analysis);
  }

  // merge sections shorter than MIN_SECTION_SEC into their predecessor
  const merged: typeof raw = [];
  for (const s of raw) {
    const prev = merged[merged.length - 1];
    if (prev && s.endTime - s.startTime < MIN_SECTION_SEC) {
      prev.endTime = s.endTime;
    } else if (prev && prev.endTime - prev.startTime < MIN_SECTION_SEC) {
      prev.endTime = s.endTime;
      prev.label = s.label;
    } else {
      merged.push({ ...s });
    }
  }

  // split overlong sections at bar boundaries — a steady-loudness song can
  // collapse detection into one giant section, which starves the planner of
  // structure. ~8-bar chunks restore a phrase-level grain.
  const split: typeof merged = [];
  for (const s of merged) {
    if (s.endTime - s.startTime <= MAX_SECTION_SEC) {
      split.push(s);
      continue;
    }
    const barsIn = analysis.downbeats.filter((d) => d > s.startTime && d < s.endTime);
    const barSec = barsIn.length > 0 ? (s.endTime - s.startTime) / (barsIn.length + 1) : 2;
    const targetChunkSec = MAX_SECTION_SEC * 0.75;
    const chunkBars = Math.max(4, Math.round(targetChunkSec / barSec));
    const cuts = barsIn.filter((_, i) => (i + 1) % chunkBars === 0);
    let prevCut = s.startTime;
    for (const cut of cuts) {
      if (cut - prevCut >= MIN_SECTION_SEC) {
        split.push({ label: s.label, startTime: prevCut, endTime: cut });
        prevCut = cut;
      }
    }
    split.push({ label: s.label, startTime: prevCut, endTime: s.endTime });
  }
  merged.length = 0;
  merged.push(...split);

  // cap count by merging the shortest adjacent pair until under the limit
  while (merged.length > MAX_SECTIONS) {
    let shortest = 0;
    for (let i = 1; i < merged.length; i++) {
      const len = (m: number) => merged[m].endTime - merged[m].startTime;
      if (len(i) < len(shortest)) shortest = i;
    }
    const eatInto = shortest === 0 ? 0 : shortest - 1;
    merged[eatInto].endTime = merged[Math.max(eatInto + 1, shortest)].endTime;
    merged.splice(Math.max(eatInto + 1, shortest), 1);
  }

  const maxLoudness = Math.max(...analysis.loudness.map((l) => l.v), 0.001);
  const downbeatSet = new Set(analysis.downbeats);

  const sections = merged.map((s, index) => {
    const beatsIn = analysis.beats.filter((b) => b >= s.startTime && b < s.endTime);
    const loudIn = analysis.loudness.filter((l) => l.t >= s.startTime && l.t < s.endTime);
    const onsetsIn = analysis.onsets.filter((o) => o >= s.startTime && o < s.endTime);
    const durationSec = Math.max(0.001, s.endTime - s.startTime);

    let avgBass: number | undefined;
    let avgHigh: number | undefined;
    if (analysis.spectralFeatures) {
      const idxs = analysis.beats
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => b >= s.startTime && b < s.endTime)
        .map(({ i }) => i);
      if (idxs.length > 0) {
        const mean = (arr: number[]) =>
          idxs.reduce((sum, i) => sum + (arr[i] ?? 0), 0) / idxs.length;
        avgBass = round3(mean(analysis.spectralFeatures.bassEnergy));
        avgHigh = round3(mean(analysis.spectralFeatures.highEnergy));
      }
    }

    return {
      index,
      label: s.label,
      startTime: round3(s.startTime),
      endTime: round3(s.endTime),
      beatCount: beatsIn.length,
      downbeatCount: beatsIn.filter((b) => downbeatSet.has(b)).length,
      avgLoudness: round3(
        loudIn.length ? loudIn.reduce((sum, l) => sum + l.v, 0) / loudIn.length / maxLoudness : 0
      ),
      peakLoudness: round3(
        loudIn.length ? Math.max(...loudIn.map((l) => l.v)) / maxLoudness : 0
      ),
      onsetDensity: round3(onsetsIn.length / durationSec),
      avgBass,
      avgHigh,
    };
  });

  // Relabel chunks that inherited a boundary label from a split parent:
  // "intro" only makes sense at the start, "outro" at the end. Everything
  // else becomes verse/chorus by loudness relative to the song median.
  const louds = [...sections.map((s) => s.avgLoudness)].sort((a, b) => a - b);
  const median = louds[Math.floor(louds.length / 2)] ?? 0.5;
  for (const s of sections) {
    const atStart = s.index === 0;
    const atEnd = s.index === sections.length - 1;
    if ((s.label === "intro" && !atStart) || (s.label === "outro" && !atEnd)) {
      s.label = s.avgLoudness > median ? "chorus" : "verse";
    }
  }
  return sections;
}

/** Phrase-length fallback sections (16 bars each) when detection produced none. */
function synthesizeSections(
  analysis: AudioAnalysis
): Array<Pick<AudioSection, "label" | "startTime" | "endTime">> {
  const barsPerSection = 16;
  const bounds = analysis.downbeats.filter((_, i) => i % barsPerSection === 0);
  if (bounds.length === 0) return [{ label: "verse", startTime: 0, endTime: analysis.duration }];
  const out: Array<Pick<AudioSection, "label" | "startTime" | "endTime">> = [];
  for (let i = 0; i < bounds.length; i++) {
    out.push({
      label: i === 0 ? "intro" : i % 2 === 1 ? "verse" : "chorus",
      startTime: bounds[i],
      endTime: i + 1 < bounds.length ? bounds[i + 1] : analysis.duration,
    });
  }
  return out;
}

/** ~20-point downsample of the loudness envelope, for the prompt's energy shape. */
export function loudnessShape(analysis: AudioAnalysis, points = 20): number[] {
  if (analysis.loudness.length === 0) return [];
  const max = Math.max(...analysis.loudness.map((l) => l.v), 0.001);
  const step = analysis.duration / points;
  const shape: number[] = [];
  for (let p = 0; p < points; p++) {
    const t0 = p * step;
    const t1 = t0 + step;
    const win = analysis.loudness.filter((l) => l.t >= t0 && l.t < t1);
    shape.push(round3(win.length ? win.reduce((s, l) => s + l.v, 0) / win.length / max : 0));
  }
  return shape;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
