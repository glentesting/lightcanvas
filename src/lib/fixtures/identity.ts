/**
 * Per-prop identity: the idle color and short display name for every prop
 * type. ONE table, used by the layout editor, the show canvas, and the prop
 * lists — replacing three divergent hardcoded color maps.
 *
 * Idle identity colors (the owner's spec): arches dark, faces Christmas
 * green, mini trees lighter green, stakes dark grey, roof strings mustard.
 * During playback every surface shows real sequence colors instead.
 */

import type { Fixture } from "./types";
import { coroShapeFor } from "./coro-shapes";

export function isFaceFixture(fixture: Fixture): boolean {
  return /^Face/.test(fixture.lor?.propName ?? "") || /^Face/i.test(fixture.name);
}

/** Idle identity color — what a prop looks like when the show isn't playing. */
export function identityColor(fixture: Fixture): string {
  if (isFaceFixture(fixture)) return "#1b7a33"; // Christmas green
  switch (coroShapeFor(fixture)) {
    case "arch": return "#3b4652"; // dark slate
    case "tiered-tree": return "#5fbf63"; // lighter green
    case "star5": return "#e3b93d"; // gold
    case "stake": return "#565c63"; // dark grey
  }
  if (fixture.lor?.stringType === "Traditional") return "#c9971c"; // mustard roof strings
  switch (fixture.kind) {
    case "roofline": return "#c9971c";
    case "window-outline": return "#c9971c";
    case "mega-tree": return "#2e7d32";
    case "mini-tree": return "#5fbf63";
    case "arch": return "#3b4652";
    case "bush": return "#565c63";
    case "matrix": return "#5b6b8c";
    default: return "#8a9099";
  }
}

/**
 * Short display name for an imported prop ("Tree 03", "Stake 12", "Elden").
 * Returns undefined when there's no better short form.
 */
export function shortNameFor(propName: string): string | undefined {
  let m = propName.match(/^RGB Mini Tree Base (\d+)$/);
  if (m) return `Tree ${m[1]}`;
  m = propName.match(/^RGB Mini Tree Star (\d+)$/);
  if (m) return `Star ${m[1]}`;
  m = propName.match(/^RGB Arch (\d+)$/);
  if (m) return `Arch ${m[1]}`;
  m = propName.match(/^RGB Pixel Stake (\d+)$/);
  if (m) return `Stake ${m[1]}`;
  m = propName.match(/^FaceV2-(Elden|Felix|Ralphie|Zuzu) (Tree Outline|Bow)$/);
  if (m) return m[1];
  return undefined;
}
