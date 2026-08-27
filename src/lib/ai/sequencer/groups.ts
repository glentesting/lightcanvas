/**
 * Fixture groups are the vocabulary Layer 1 speaks. The model addresses
 * "mini-trees" or "arches", never individual fixture ids — that's what keeps
 * a section plan compact regardless of how many props the display has.
 */

import type { Fixture } from "@/lib/fixtures/types";

export interface SequencerGroup {
  /** stable key the model echoes back (kebab-case) */
  key: string;
  label: string;
  /** fixtures in display order — movement patterns (left-to-right etc.) follow this order */
  fixtures: Fixture[];
}

const KIND_GROUPS: Array<{ key: string; label: string; kinds: string[] }> = [
  { key: "roofline", label: "Roofline / AC outline", kinds: ["roofline"] },
  { key: "windows", label: "Window outlines", kinds: ["window-outline"] },
  { key: "mega-tree", label: "Mega tree", kinds: ["mega-tree"] },
  { key: "mini-trees", label: "Mini trees", kinds: ["mini-tree"] },
  { key: "arches", label: "Arches", kinds: ["arch"] },
  { key: "stakes", label: "Pixel stakes / bushes", kinds: ["bush"] },
  { key: "matrix", label: "Matrix", kinds: ["matrix"] },
  { key: "other", label: "Other props", kinds: ["custom"] },
];

export function deriveFixtureGroups(fixtures: Fixture[]): SequencerGroup[] {
  const groups: SequencerGroup[] = [];
  for (const def of KIND_GROUPS) {
    const members = fixtures.filter((f) => def.kinds.includes(f.kind));
    if (members.length > 0) {
      groups.push({ key: def.key, label: def.label, fixtures: members });
    }
  }
  return groups;
}

/** Resolve a model-echoed group key back to a group, tolerating case/underscore noise. */
export function resolveGroup(groups: SequencerGroup[], key: string): SequencerGroup | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_]+/g, "-");
  const wanted = norm(key);
  return groups.find((g) => norm(g.key) === wanted);
}
