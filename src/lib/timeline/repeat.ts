/**
 * Copy, paste-at-beat, and repeat-every-bar.
 *
 * Real sequences are built from repetition — the purchased reference holds
 * 50,695 effects and almost none of them were placed one at a time. These are
 * pure functions so they can be tested without a browser
 * (scripts/verify-timeline-edit.mts).
 */

import type { AudioAnalysis } from "@/lib/audio/types";
import type { EffectBlock } from "./types";

/** The nearest beat to `t`, with no "close enough" threshold — pasting should
 *  always land in time, however far the playhead sits from a beat. */
export function nearestBeat(t: number, beats: number[]): number {
  if (beats.length === 0) return t;
  let best = beats[0];
  let bestD = Math.abs(t - beats[0]);
  for (const b of beats) {
    const d = Math.abs(t - b);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/**
 * How long one bar of this song lasts, in seconds.
 * Measured from the detected downbeats when there are enough of them (they are
 * what the song actually does); otherwise four beats at the detected tempo.
 */
export function barSeconds(analysis: AudioAnalysis | null): number {
  const downbeats = analysis?.downbeats ?? [];
  if (downbeats.length >= 3) {
    const gaps: number[] = [];
    for (let i = 1; i < downbeats.length; i++) gaps.push(downbeats[i] - downbeats[i - 1]);
    gaps.sort((a, b) => a - b);
    const median = gaps[Math.floor(gaps.length / 2)];
    if (median > 0.2) return median;
  }
  const bpm = analysis?.bpm && analysis.bpm > 0 ? analysis.bpm : 120;
  return (60 / bpm) * 4;
}

/** One copied block, stored relative to the start of the copied span. */
export interface ClipboardEntry {
  trackId: string;
  effectId: EffectBlock["effectId"];
  /** seconds after the earliest block in the copied selection */
  offset: number;
  duration: number;
  params: EffectBlock["params"];
  presetId?: string;
  presetName?: string;
}

export interface Clipboard {
  entries: ClipboardEntry[];
  /** total length of what was copied, for the UI to describe it */
  span: number;
}

/** Snapshot a selection, anchored so the earliest block sits at offset 0. */
export function toClipboard(blocks: EffectBlock[]): Clipboard {
  if (blocks.length === 0) return { entries: [], span: 0 };
  const anchor = Math.min(...blocks.map((b) => b.start));
  const end = Math.max(...blocks.map((b) => b.start + b.duration));
  return {
    span: end - anchor,
    entries: blocks.map((b) => ({
      trackId: b.trackId,
      effectId: b.effectId,
      offset: b.start - anchor,
      duration: b.duration,
      params: { ...b.params },
      presetId: b.presetId,
      presetName: b.presetName,
    })),
  };
}

export interface PasteResult {
  blocks: EffectBlock[];
  /** rows that no longer exist, so the caller can say so instead of silently
   *  dropping part of the paste */
  droppedTracks: number;
}

/**
 * Paste the clipboard at `atTime`, with EVERY block landing on a beat.
 *
 * Detected beats are not evenly spaced — they are where the drums actually
 * hit. Anchoring only the first block and keeping the rest at fixed second
 * offsets would leave the tail of a pasted phrase between beats, which is
 * exactly the thing a light show cannot afford. So each block is placed at
 * anchor + its offset and then pulled onto its own nearest beat.
 */
export function pasteAt(
  clip: Clipboard,
  atTime: number,
  beats: number[],
  existingTrackIds: Set<string>,
  maxTime = Infinity
): PasteResult {
  const anchor = Math.max(0, nearestBeat(atTime, beats));
  const blocks: EffectBlock[] = [];
  let droppedTracks = 0;
  for (const e of clip.entries) {
    if (!existingTrackIds.has(e.trackId)) {
      droppedTracks++;
      continue;
    }
    const start = e.offset === 0 ? anchor : nearestBeat(anchor + e.offset, beats);
    const duration = Math.min(e.duration, maxTime - start);
    if (start >= maxTime || duration < MIN_BLOCK_SECONDS) continue;
    blocks.push({
      id: crypto.randomUUID(),
      trackId: e.trackId,
      effectId: e.effectId,
      start,
      duration,
      params: { ...e.params },
      presetId: e.presetId,
      presetName: e.presetName,
    });
  }
  return { blocks, droppedTracks };
}

export interface RepeatOptions {
  /** how far apart the copies sit, in bars */
  everyBars: number;
  /** how many extra copies to make */
  times: number;
  /** length of one bar, in seconds */
  bar: number;
  /** detected beats — each copy is nudged onto the nearest one so a slightly
   *  off bar length cannot drift out of time over eight repeats */
  beats: number[];
  /** nothing is written past the end of the song */
  maxTime: number;
}

/**
 * Repeat a selection at a fixed spacing. The selection keeps its internal
 * shape; the whole thing is stamped again every `everyBars` bars.
 */
export function repeatSelection(selected: EffectBlock[], opts: RepeatOptions): EffectBlock[] {
  if (selected.length === 0 || opts.times < 1 || opts.bar <= 0) return [];
  const anchor = Math.min(...selected.map((b) => b.start));
  const step = opts.bar * opts.everyBars;
  const out: EffectBlock[] = [];

  for (let i = 1; i <= opts.times; i++) {
    // Checked BEFORE snapping: past the last beat, nearestBeat would pull
    // every remaining copy back onto that beat and stack them there.
    const raw = anchor + step * i;
    if (raw >= opts.maxTime) break;
    // measured from the original anchor each time, then snapped — so rounding
    // never accumulates across copies
    const target = nearestBeat(raw, opts.beats);
    const shift = target - anchor;
    for (const b of selected) {
      // the block that defines the anchor lands exactly on the bar line; the
      // rest are pulled onto their own nearest beat, for the same reason paste
      // does it — the beat grid is not evenly spaced
      const start = b.start === anchor ? target : nearestBeat(b.start + shift, opts.beats);
      const duration = Math.min(b.duration, opts.maxTime - start);
      if (start >= opts.maxTime || duration < MIN_BLOCK_SECONDS) continue;
      out.push({
        ...b,
        id: crypto.randomUUID(),
        start,
        duration,
        params: { ...b.params },
      });
    }
  }
  return out;
}

/** Anything shorter than this is not a lighting move, it is a glitch. */
const MIN_BLOCK_SECONDS = 0.1;

/** How many blocks a repeat would add — shown before you commit to it. Counted
 *  without building them, since this runs on every keystroke in the popover. */
export function repeatCount(selected: EffectBlock[], opts: RepeatOptions): number {
  if (selected.length === 0 || opts.times < 1 || opts.bar <= 0) return 0;
  const anchor = Math.min(...selected.map((b) => b.start));
  const step = opts.bar * opts.everyBars;
  let n = 0;
  for (let i = 1; i <= opts.times; i++) {
    const raw = anchor + step * i;
    if (raw >= opts.maxTime) break;
    const target = nearestBeat(raw, opts.beats);
    const shift = target - anchor;
    for (const b of selected) {
      const start = b.start === anchor ? target : nearestBeat(b.start + shift, opts.beats);
      if (start < opts.maxTime && Math.min(b.duration, opts.maxTime - start) >= MIN_BLOCK_SECONDS) n++;
    }
  }
  return n;
}
