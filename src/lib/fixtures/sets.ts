/**
 * Ready-made sets of light pieces — "all the arches", "all the mini trees" —
 * so one lighting move can be dropped on a whole set at once.
 *
 * The purchased sequences lean on these heavily; building a show one prop at a
 * time is what makes hand-sequencing 84 pieces impossible.
 */

import type { Fixture, FixtureGroup } from "./types";
import { coroShapeFor } from "./coro-shapes";

export interface SetPreset {
  /** display name, used as the group name */
  label: string;
  /** plain-English hint under the name */
  hint: string;
  fixtureIds: string[];
  color: string;
}

/** Track colours for group rows, in the order groups get created. */
export const GROUP_COLORS = [
  "#6366f1", // indigo
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#ef4444", // red
];

export function nextGroupColor(existing: FixtureGroup[]): string {
  return GROUP_COLORS[existing.length % GROUP_COLORS.length];
}

/**
 * The sets worth offering for this display, in the order they read on the
 * house. Only sets with at least two pieces are offered — a "group" of one is
 * just the piece itself.
 */
export function setPresets(fixtures: Fixture[], existing: FixtureGroup[]): SetPreset[] {
  const defs: Array<{ label: string; hint: string; match: (f: Fixture) => boolean }> = [
    {
      label: "All Mini Trees",
      hint: "every mini tree, in number order",
      match: (f) => coroShapeFor(f) === "tiered-tree",
    },
    {
      label: "All Tree Stars",
      hint: "the star on top of each tree",
      match: (f) => coroShapeFor(f) === "star5",
    },
    {
      label: "All Arches",
      hint: "every arch across the yard",
      match: (f) => coroShapeFor(f) === "arch",
    },
    {
      label: "All Yard Stakes",
      hint: "every stake along the path",
      match: (f) => coroShapeFor(f) === "stake",
    },
    {
      label: "All Roof Lights",
      hint: "the plain on/off strings along your roof",
      match: (f) => f.lor?.stringType === "Traditional" || (!f.lor && f.kind === "roofline"),
    },
    {
      label: "All Singing Faces",
      hint: "Elden, Felix, Ralphie and Zuzu",
      match: (f) => f.lor?.stringType === "DumbRGB",
    },
  ];

  const taken = new Set(existing.map((g) => g.name));
  const out: SetPreset[] = [];
  let colorIndex = existing.length;

  for (const def of defs) {
    if (taken.has(def.label)) continue;
    // A star that sits on a tree still has its own circuit, so it belongs in
    // a sequencing set even though it cannot be dragged on its own.
    const ids = fixtures
      .filter(def.match)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((f) => f.id);
    if (ids.length < 2) continue;
    out.push({
      label: def.label,
      hint: def.hint,
      fixtureIds: ids,
      color: GROUP_COLORS[colorIndex++ % GROUP_COLORS.length],
    });
  }
  return out;
}
