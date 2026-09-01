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
 * Motion-effect settings strings are copied verbatim from known-good forms
 * observed in the reference file — only the ARGB colour slots are substituted.
 * Three grammars are used, covering 94% of the 50,695 reference effects:
 *   colorwash (11,578 observed) · curtain (3,332) · bars (344)
 * Anything the app can show that LOR has no motion effect for (twinkle,
 * sparkle) falls back to colorwash, and `fidelity.ts` says so in the UI
 * before the user exports.
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
 * LOR motion effects carry a six-slot colour palette; each slot holds an ARGB
 * value and a 0/1 flag saying whether that slot is in play. Slot values are
 * freely overwritten by LOR itself (the reference file has duplicate slot
 * values all over), so substituting the block's colours into the first one or
 * two slots produces exactly the shape LOR writes.
 */
const PALETTE_SLOT_DEFAULTS = [
  "FFFF0000",
  "FF00FF00",
  "FF0000FF",
  "FFFFFF00",
  "FFFFFFFF",
  "FF00FFFF",
];

export function palette(color1: string, color2?: string): string {
  const slots = [...PALETTE_SLOT_DEFAULTS];
  slots[0] = argbHex(color1);
  if (color2) slots[1] = argbHex(color2);
  const activeCount = color2 ? 2 : 1;
  return slots.map((s, i) => `${s},${i < activeCount ? 1 : 0}`).join(";");
}

/** The unused second effect slot, in the all-off form observed on curtain/bars rows. */
const NO_SECOND_EFFECT =
  "lightorama_none:FFFF0000,0;FF00FF00,0;FF0000FF,0;FFFFFF00,0;FFFFFFFF,0;FF000000,0:";

/**
 * Colorwash settings string, in the exact shape LOR writes it (9,641 six-slot
 * colorwash effects observed in the reference). Only the ARGB values are
 * substituted.
 *
 * `blink` switches the intensity mode to blink_in_unison — the shape LOR
 * writes for a blinking wash (301 observed) — which is what a strobe is.
 */
export function colorwashSettings(color1: string, color2?: string, blink = false): string {
  const mode = blink ? "blink_in_unison" : "full";
  return (
    `Mix_Average|0|0|${mode}|20|lightorama_colorwash:${palette(color1, color2)}:` +
    `full,full,single_color|${NO_SECOND_EFFECT}`
  );
}

/** Where a curtain sweeps from, and whether it reveals or retracts. */
export type CurtainEdge = "center" | "left" | "right" | "top" | "bottom" | "middle";
export type CurtainMotion = "open" | "close" | "chase" | "open_then_close" | "close_then_open";

/**
 * Curtain settings string — a directional reveal. Grammar observed verbatim
 * across 3,332 reference effects; the trailing parameters
 * (`0,once_fit_to_duration,12,R0R100R1.00R2.00R0.00`) are the reference's own
 * constants and are copied unchanged. `once_fit_to_duration` makes the sweep
 * span exactly the block, which is what a beat-snapped block wants.
 */
export function curtainSettings(
  color1: string,
  color2: string | undefined,
  edge: CurtainEdge,
  motion: CurtainMotion
): string {
  return (
    `Mix_Average|0|0|full|20|lightorama_curtain:${palette(color1, color2)}:` +
    `${edge},${motion},0,once_fit_to_duration,12,R0R100R1.00R2.00R0.00|${NO_SECOND_EFFECT}`
  );
}

/** Which way marching bars travel. */
export type BarsDirection =
  | "default" | "left" | "right" | "up" | "down"
  | "up_left" | "up_right" | "down_left"
  | "H_expand" | "H_compress" | "V_expand" | "V_compress";

/**
 * The bar-width value LOR pairs with each direction. These are not free
 * numbers: the reference file only ever writes certain (direction, width)
 * pairs — expanding/compressing bars come out at 22, the rest at 12 — so each
 * direction takes the width actually observed with it.
 * `verify-effect-grammar.mts` fails if this drifts.
 */
const BARS_WIDTH: Record<BarsDirection, number> = {
  default: 12,
  left: 12,
  right: 12,
  up: 12,
  down: 12,
  up_left: 12,
  up_right: 12,
  down_left: 22,
  H_expand: 22,
  H_compress: 22,
  V_expand: 12,
  V_compress: 12,
};

/**
 * Bars settings string — bars marching across the prop. Grammar observed
 * verbatim across 344 reference effects; the trailing parameters
 * (`1,False,True,<width>,0`) are the reference's own constants, copied
 * unchanged.
 */
export function barsSettings(
  color1: string,
  color2: string | undefined,
  direction: BarsDirection
): string {
  return (
    `Mix_Average|0|0|full|20|lightorama_bars:${palette(color1, color2)}:` +
    `${direction},1,False,True,${BARS_WIDTH[direction]},0|${NO_SECOND_EFFECT}`
  );
}

const BARS_DIRECTION: Record<string, BarsDirection> = {
  forward: "right",
  backward: "left",
  "center-out": "H_expand",
  in: "H_compress",
};

/**
 * Pick the LOR motion effect that best matches what the app just showed on
 * screen. `fidelity.ts` describes each of these choices in plain English and
 * is the same table the export dialog reads — keep the two in step.
 */
function rgbSettingsFor(block: EffectBlock): string {
  const { color1, color2, direction = "forward" } = block.params;
  switch (block.effectId) {
    // a head running along the pixel order
    case "chase":
    case "meteor":
      // sweeping out from (or into) the middle is a curtain, not marching bars
      if (direction === "center-out") return curtainSettings(color1, color2, "center", "open");
      if (direction === "in") return curtainSettings(color1, color2, "center", "close");
      return barsSettings(color1, color2, BARS_DIRECTION[direction] ?? "right");
    // a band travelling along the prop, over and over
    case "wave":
      return barsSettings(color1, color2, BARS_DIRECTION[direction] ?? "right");
    // bursts opening outward
    case "firework":
      return curtainSettings(color1, color2, "center", "open");
    case "strobe":
      return colorwashSettings(color1, color2, true);
    // wash / fade / pulse — and twinkle / sparkle, which LOR has no motion
    // effect for (fidelity.ts says so in the UI before export)
    default:
      return colorwashSettings(color1, color2);
  }
}

/**
 * Pixel-prop blocks become motion effects in the block's colors, using the
 * grammar that matches the effect. Fade gets intensity ramps and pulse gets a
 * decay ramp per beat, the same envelope shapes the AC path uses (motion
 * effects carry startIntensity/endIntensity in the reference too).
 */
export function translateBlocksForRgbTrack(blocks: EffectBlock[], ctx: TranslateContext): XmlElement[] {
  const envelopes: Envelope[] = [];
  for (const block of blocks) {
    const startCs = toCs(block.start);
    const endCs = toCs(block.start + block.duration);
    const level = pct(block.params.intensity);
    const settings = rgbSettingsFor(block);
    if (block.effectId === "fade") {
      const midCs = Math.round((startCs + endCs) / 2);
      envelopes.push(
        { startCs, endCs: midCs, startIntensity: 0, endIntensity: level, settings },
        { startCs: midCs, endCs, startIntensity: level, endIntensity: 0, settings }
      );
    } else if (block.effectId === "firework") {
      // one burst per firework, spaced the way the preview spaces them
      const bursts = Math.max(1, Math.round(block.params.burstCount ?? 3));
      const span = (endCs - startCs) / bursts;
      for (let b = 0; b < bursts; b++) {
        const bStart = Math.round(startCs + b * span);
        const bEnd = Math.round(startCs + (b + 1) * span);
        if (bEnd > bStart) envelopes.push({ startCs: bStart, endCs: bEnd, intensity: level, settings });
      }
    } else if (block.effectId === "pulse") {
      const beatsIn = ctx.beats.filter((b) => b >= block.start && b < block.start + block.duration);
      if (beatsIn.length === 0) {
        envelopes.push({ startCs, endCs, intensity: level, settings });
      } else {
        for (const beat of beatsIn) {
          const bStart = toCs(beat);
          const bEnd = Math.min(toCs(beat + 0.25), endCs);
          if (bEnd > bStart) {
            envelopes.push({ startCs: bStart, endCs: bEnd, startIntensity: level, endIntensity: 0, settings });
          }
        }
      }
    } else {
      envelopes.push({ startCs, endCs, intensity: level, settings });
    }
  }
  return normalize(envelopes, ctx.totalCentiseconds).map(envelopeToEffect);
}
