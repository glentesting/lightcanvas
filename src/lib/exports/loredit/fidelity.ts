/**
 * What-you-see-vs-what-exports, in plain English.
 *
 * The app can draw more than Light-O-Rama can be told to do. This file is the
 * single place that says, for each lighting move on each kind of light piece,
 * what the hardware will actually do — so the app can warn BEFORE an export,
 * not after the show runs.
 *
 * It describes exactly what `effects.ts` emits. When the translation there
 * changes, change the sentence here in the same edit.
 */

import type { EffectId } from "@/lib/timeline/types";
import type { Fixture } from "@/lib/fixtures/types";

/** How a light piece is wired, which decides what it can be told to do. */
export type WireKind = "RGB" | "Traditional" | "DumbRGB";

export type Fidelity =
  /** the hardware does what the preview shows */
  | "exact"
  /** the same idea reaches the lights, with some detail decided by LOR */
  | "close"
  /** the look does not exist in Light-O-Rama; something plainer is sent */
  | "approximate";

export interface FidelityNote {
  fidelity: Fidelity;
  /** what the lights will actually do */
  asExported: string;
  /** what the preview shows that the lights will not — only when not exact */
  loses?: string;
}

/** The wire kind of a fixture. Imported props carry it; anything else is a
 *  smart-pixel prop as far as the exporter is concerned. */
export function wireKindOf(fixture: Fixture): WireKind {
  return fixture.lor?.stringType ?? "RGB";
}

/** Plain-English name for a wire kind, for UI copy. */
export const WIRE_KIND_LABEL: Record<WireKind, string> = {
  RGB: "Smart pixel pieces (trees, arches, stakes, stars)",
  Traditional: "Plain on/off strings (your roof lights)",
  DumbRGB: "One-colour pieces (the singing faces)",
};

/* ── Smart pixel props (LOR motion effects) ─────────────────────────────── */

const RGB_NOTES: Record<EffectId, FidelityNote> = {
  wash: {
    fidelity: "exact",
    asExported: "A colour wash in your chosen colours.",
  },
  fade: {
    fidelity: "exact",
    asExported: "A colour wash that fades up and back down.",
  },
  pulse: {
    fidelity: "exact",
    asExported: "A colour wash that flashes bright on each beat and decays.",
  },
  strobe: {
    fidelity: "close",
    asExported: "A colour wash set to blink.",
    loses: "Light-O-Rama sets the blink rate, so it may not match the speed you set here.",
  },
  chase: {
    fidelity: "close",
    asExported: "A bar of light travelling the way you set — or sweeping out from the middle if you chose that.",
    loses: "The soft trailing tail is Light-O-Rama's own; your exact trail length is not sent.",
  },
  wave: {
    fidelity: "close",
    asExported: "Bars of light marching along the piece.",
    loses: "The smooth rise-and-fall of the wave becomes evenly spaced bars.",
  },
  meteor: {
    fidelity: "approximate",
    asExported: "A bar of light travelling the way you set.",
    loses: "The comet tail that fades out behind the head — the bar has a hard edge.",
  },
  firework: {
    fidelity: "approximate",
    asExported: "Bursts that open outward from the middle, one per burst you set.",
    loses: "The random burst positions and the white flash at the start of each burst.",
  },
  twinkle: {
    fidelity: "approximate",
    asExported: "A plain colour wash.",
    loses: "The random flickering. Light-O-Rama has no twinkling move for smart pixel pieces.",
  },
  sparkle: {
    fidelity: "approximate",
    asExported: "A plain colour wash in the first colour.",
    loses: "The random sparks and the second colour mixed into them.",
  },
};

/* ── Plain on/off strings (AC circuits — brightness only) ───────────────── */

const AC_STEADY: FidelityNote = {
  fidelity: "approximate",
  asExported: "The string stays on at a steady brightness.",
  loses: "Colour and movement. This string is one on/off circuit on the wire — every bulb dims together.",
};

const TRADITIONAL_NOTES: Record<EffectId, FidelityNote> = {
  fade: { fidelity: "exact", asExported: "The string dims up and back down." },
  pulse: { fidelity: "exact", asExported: "The string flashes bright on each beat and decays." },
  strobe: { fidelity: "exact", asExported: "The string shimmers." },
  twinkle: { fidelity: "exact", asExported: "The string twinkles." },
  sparkle: { fidelity: "exact", asExported: "The string twinkles." },
  wash: AC_STEADY,
  chase: AC_STEADY,
  wave: AC_STEADY,
  meteor: AC_STEADY,
  firework: AC_STEADY,
};

/* ── One-colour pieces (the singing faces) ──────────────────────────────── */

const DUMB_STEADY_NO_MOTION: FidelityNote = {
  fidelity: "approximate",
  asExported: "The whole piece lights in one steady colour.",
  loses: "All movement. This piece is a single colour on the wire — it cannot chase or wave.",
};

const DUMBRGB_NOTES: Record<EffectId, FidelityNote> = {
  wash: { fidelity: "exact", asExported: "The whole piece lights in your chosen colour." },
  strobe: { fidelity: "close", asExported: "The whole piece shimmers in your colour.", loses: "Light-O-Rama sets the shimmer rate." },
  twinkle: { fidelity: "close", asExported: "The whole piece twinkles in your colour.", loses: "Light-O-Rama sets the twinkle pattern." },
  sparkle: { fidelity: "close", asExported: "The whole piece twinkles in your colour.", loses: "The second colour and the spark decay." },
  fade: {
    fidelity: "approximate",
    asExported: "The whole piece holds a steady colour for the whole block.",
    loses: "The fade up and down.",
  },
  pulse: {
    fidelity: "approximate",
    asExported: "The whole piece holds a steady colour for the whole block.",
    loses: "The flash on each beat.",
  },
  chase: DUMB_STEADY_NO_MOTION,
  wave: DUMB_STEADY_NO_MOTION,
  meteor: DUMB_STEADY_NO_MOTION,
  firework: DUMB_STEADY_NO_MOTION,
};

const TABLES: Record<WireKind, Record<EffectId, FidelityNote>> = {
  RGB: RGB_NOTES,
  Traditional: TRADITIONAL_NOTES,
  DumbRGB: DUMBRGB_NOTES,
};

/** What the hardware will actually do with this lighting move on this wiring. */
export function exportFidelity(effectId: EffectId, wire: WireKind): FidelityNote {
  return TABLES[wire][effectId];
}

export const FIDELITY_LABEL: Record<Fidelity, string> = {
  exact: "Comes out exactly as previewed",
  close: "Comes out very close",
  approximate: "Comes out plainer than the preview",
};

export const FIDELITY_COLOR: Record<Fidelity, { bg: string; border: string; ink: string }> = {
  exact: { bg: "#ecfdf5", border: "#a7f3d0", ink: "#065f46" },
  close: { bg: "#eff6ff", border: "#bfdbfe", ink: "#1e40af" },
  approximate: { bg: "#fffbeb", border: "#fde68a", ink: "#92400e" },
};

export interface FidelityRow extends FidelityNote {
  effectId: EffectId;
  wire: WireKind;
  /** how many blocks in the sequence land in this bucket */
  blockCount: number;
  /** how many light pieces are affected */
  fixtureCount: number;
}

/**
 * Walk a sequence and report every (lighting move × wiring) combination it
 * actually uses, worst fidelity first. This is what the export dialog shows.
 * Blocks on a group track count once for every member piece, because that is
 * what the exporter writes.
 */
export function summariseExportFidelity(
  blocks: Array<{ trackId: string; effectId: EffectId }>,
  fixtures: Fixture[],
  groups: Array<{ id: string; fixtureIds: string[] }>
): FidelityRow[] {
  const fixtureById = new Map(fixtures.map((f) => [f.id, f]));
  const buckets = new Map<string, FidelityRow & { fixtureIds: Set<string> }>();

  const record = (effectId: EffectId, fixture: Fixture) => {
    const wire = wireKindOf(fixture);
    const key = `${effectId}:${wire}`;
    let row = buckets.get(key);
    if (!row) {
      row = {
        effectId,
        wire,
        blockCount: 0,
        fixtureCount: 0,
        fixtureIds: new Set<string>(),
        ...exportFidelity(effectId, wire),
      };
      buckets.set(key, row);
    }
    row.blockCount++;
    row.fixtureIds.add(fixture.id);
  };

  for (const block of blocks) {
    const own = fixtureById.get(block.trackId);
    if (own) {
      record(block.effectId, own);
      continue;
    }
    const group = groups.find((g) => g.id === block.trackId);
    if (!group) continue;
    for (const id of group.fixtureIds) {
      const f = fixtureById.get(id);
      if (f) record(block.effectId, f);
    }
  }

  const order: Record<Fidelity, number> = { approximate: 0, close: 1, exact: 2 };
  return Array.from(buckets.values())
    .map(({ fixtureIds, ...row }) => ({ ...row, fixtureCount: fixtureIds.size }))
    .sort((a, b) => order[a.fidelity] - order[b.fidelity] || b.blockCount - a.blockCount);
}
