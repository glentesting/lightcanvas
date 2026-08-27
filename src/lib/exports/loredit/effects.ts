/**
 * Effect translation: LightCanvas timeline blocks → LOR .loredit effects.
 *
 * The grammar rule is absolute (verified across all 50,695 effects in the
 * reference file — zero exceptions):
 *   - Traditional (AC) props  → <channel> rows, INTENSITY/SHIMMER/TWINKLE only
 *   - DumbRGB props (faces)   → <channel> rows, color packed as signed 32-bit
 *                               ARGB in the intensity attribute
 *   - RGB (pixel) props       → <track> rows, motion-effect settings strings
 *
 * Motion-effect settings strings are copied from known-good forms observed in
 * the reference file — only the ARGB color list inside the verified colorwash
 * grammar is substituted. Parameter grammar beyond colorwash is still
 * unverified in S6, so every pixel-prop block becomes a colorwash for now.
 */

import type { EffectBlock } from "@/lib/timeline/types";
import { el } from "./xml";
import type { XmlElement } from "./xml";

export interface TranslateContext {
  /** Detected beat times in seconds (may be empty) */
  beats: number[];
  /** Sequence length in centiseconds — effects are clamped to this */
  totalCentiseconds: number;
}

const toCs = (seconds: number) => Math.max(0, Math.round(seconds * 100));
const pct = (v: number) => Math.max(0, Math.min(100, Math.round(v * 100)));

interface Envelope {
  startCs: number;
  endCs: number;
  /** constant intensity 0–100, or packed ARGB for DumbRGB */
  intensity?: number;
  startIntensity?: number;
  endIntensity?: number;
  settings: string;
}

function envelopeToEffect(e: Envelope): XmlElement {
  const attrs: Record<string, string | number> = {
    startCentisecond: e.startCs,
    endCentisecond: e.endCs,
  };
  // LOR grammar: an effect carries either intensity OR startIntensity+endIntensity, never both
  if (e.startIntensity !== undefined && e.endIntensity !== undefined) {
    attrs.startIntensity = e.startIntensity;
    attrs.endIntensity = e.endIntensity;
  } else {
    attrs.intensity = e.intensity ?? 100;
  }
  attrs.settings = e.settings;
  return el("effect", attrs);
}

/** Sort by start, clamp to the sequence, and truncate overlaps (LOR rows are non-overlapping). */
function normalize(envelopes: Envelope[], totalCs: number): Envelope[] {
  const sorted = envelopes
    .map((e) => ({ ...e, startCs: Math.min(e.startCs, totalCs), endCs: Math.min(e.endCs, totalCs) }))
    .filter((e) => e.endCs > e.startCs)
    .sort((a, b) => a.startCs - b.startCs);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].endCs > sorted[i + 1].startCs) sorted[i].endCs = sorted[i + 1].startCs;
  }
  return sorted.filter((e) => e.endCs > e.startCs);
}

/* ── Traditional (AC) ─────────────────────────────────────────────────── */

/**
 * AC circuits are single-intensity dimmers. Each LightCanvas effect maps to
 * the closest classic-LOR envelope:
 *   fade   → ramp up then ramp down (mirrors the render engine's envelope)
 *   pulse  → a short decay ramp on every beat inside the block
 *   strobe → SHIMMER at the block intensity
 *   twinkle/sparkle → TWINKLE at the block intensity
 *   everything else → constant INTENSITY (documented approximation)
 */
export function translateBlocksForAC(blocks: EffectBlock[], ctx: TranslateContext): XmlElement[] {
  const envelopes: Envelope[] = [];
  for (const block of blocks) {
    const startCs = toCs(block.start);
    const endCs = toCs(block.start + block.duration);
    const level = pct(block.params.intensity);
    switch (block.effectId) {
      case "fade": {
        const midCs = Math.round((startCs + endCs) / 2);
        envelopes.push(
          { startCs, endCs: midCs, startIntensity: 0, endIntensity: level, settings: "INTENSITY" },
          { startCs: midCs, endCs, startIntensity: level, endIntensity: 0, settings: "INTENSITY" }
        );
        break;
      }
      case "pulse": {
        const beatsIn = ctx.beats.filter((b) => b >= block.start && b < block.start + block.duration);
        if (beatsIn.length === 0) {
          envelopes.push({ startCs, endCs, intensity: level, settings: "INTENSITY" });
        } else {
          for (const beat of beatsIn) {
            const bStart = toCs(beat);
            const bEnd = Math.min(toCs(beat + 0.25), endCs);
            if (bEnd > bStart) {
              envelopes.push({ startCs: bStart, endCs: bEnd, startIntensity: level, endIntensity: 0, settings: "INTENSITY" });
            }
          }
        }
        break;
      }
      case "strobe":
        envelopes.push({ startCs, endCs, intensity: level, settings: "SHIMMER" });
        break;
      case "twinkle":
      case "sparkle":
        envelopes.push({ startCs, endCs, intensity: level, settings: "TWINKLE" });
        break;
      default:
        envelopes.push({ startCs, endCs, intensity: level, settings: "INTENSITY" });
        break;
    }
  }
  return normalize(envelopes, ctx.totalCentiseconds).map(envelopeToEffect);
}

/* ── DumbRGB (singing-tree faces, floods) ─────────────────────────────── */

/** #rrggbb (scaled by intensity 0–1) → signed 32-bit ARGB, e.g. full red = -65536 */
export function packDumbRgbColor(hex: string, intensity: number): number {
  const h = hex.replace("#", "");
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp((parseInt(h.substring(0, 2), 16) || 0) * intensity);
  const g = clamp((parseInt(h.substring(2, 4), 16) || 0) * intensity);
  const b = clamp((parseInt(h.substring(4, 6), 16) || 0) * intensity);
  // signed 32-bit: 0xFFxxxxxx maps to a negative number
  return ((0xff << 24) | (r << 16) | (g << 8) | b) | 0;
}

/**
 * DumbRGB rows carry the color as a packed ARGB int in `intensity`. Only
 * constant blocks are emitted — ramp semantics for packed colors are
 * unverified in S6.
 */
export function translateBlocksForDumbRgb(blocks: EffectBlock[], ctx: TranslateContext): XmlElement[] {
  const envelopes: Envelope[] = blocks.map((block) => ({
    startCs: toCs(block.start),
    endCs: toCs(block.start + block.duration),
    intensity: packDumbRgbColor(block.params.color1, block.params.intensity),
    settings: block.effectId === "strobe" ? "SHIMMER" : block.effectId === "twinkle" || block.effectId === "sparkle" ? "TWINKLE" : "INTENSITY",
  }));
  return normalize(envelopes, ctx.totalCentiseconds).map(envelopeToEffect);
}

/* ── RGB (smart pixel) props ──────────────────────────────────────────── */

/** #rrggbb → LOR's uppercase ARGB hex, e.g. "#ff0000" → "FFFF0000" */
export function argbHex(hex: string): string {
  const h = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  return `FF${h.toUpperCase()}`;
}

/**
 * Colorwash settings string, in the exact shape LOR writes it (observed
 * verbatim on "RGB Mini Tree Base 01" in the reference file, with a
 * variable-length color list). Only the ARGB values are substituted.
 */
export function colorwashSettings(color1: string, color2?: string): string {
  const colors = color2 ? `${argbHex(color1)},1;${argbHex(color2)},1` : `${argbHex(color1)},1`;
  return `Mix_Average|0|0|full|20|lightorama_colorwash:${colors}:full,full,single_color|lightorama_none::`;
}

/**
 * Every pixel-prop block becomes a colorwash motion effect in the block's
 * colors — the one settings grammar verified against the reference file.
 * Fade blocks additionally get intensity ramps (motion effects carry
 * startIntensity/endIntensity in the reference too).
 */
export function translateBlocksForRgbTrack(blocks: EffectBlock[], ctx: TranslateContext): XmlElement[] {
  const envelopes: Envelope[] = [];
  for (const block of blocks) {
    const startCs = toCs(block.start);
    const endCs = toCs(block.start + block.duration);
    const level = pct(block.params.intensity);
    const settings = colorwashSettings(block.params.color1, block.params.color2);
    if (block.effectId === "fade") {
      const midCs = Math.round((startCs + endCs) / 2);
      envelopes.push(
        { startCs, endCs: midCs, startIntensity: 0, endIntensity: level, settings },
        { startCs: midCs, endCs, startIntensity: level, endIntensity: 0, settings }
      );
    } else {
      envelopes.push({ startCs, endCs, intensity: level, settings });
    }
  }
  return normalize(envelopes, ctx.totalCentiseconds).map(envelopeToEffect);
}
