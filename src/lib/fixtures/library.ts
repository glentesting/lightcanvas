import type { Fixture, FixtureKind } from "./types";

export interface FixtureTemplate {
  kind: FixtureKind;
  name: string;
  pixelCount: number;
}

export const FIXTURE_TEMPLATES: FixtureTemplate[] = [
  { kind: "roofline", name: "Roofline", pixelCount: 220 },
  { kind: "mega-tree", name: "Mega Tree", pixelCount: 480 },
  { kind: "mini-tree", name: "Mini Tree", pixelCount: 50 },
  { kind: "arch", name: "Arch", pixelCount: 50 },
  { kind: "bush", name: "Bush Wrap", pixelCount: 60 },
  { kind: "window-outline", name: "Window", pixelCount: 32 },
];

/**
 * Calculate the next available start channel that doesn't overlap
 * with existing fixtures. Each pixel uses 3 channels (RGB).
 */
export function nextStartChannel(fixtures: Fixture[]): number {
  if (fixtures.length === 0) return 1;
  const maxEnd = Math.max(
    ...fixtures.map((f) => f.startChannel + f.pixelCount * 3)
  );
  return maxEnd + 1;
}

/**
 * Generate an auto-incremented name for a new fixture of the given kind.
 * e.g., "Arch 1", "Arch 2", "Arch 3"
 */
export function autoName(kind: FixtureKind, fixtures: Fixture[]): string {
  const template = FIXTURE_TEMPLATES.find((t) => t.kind === kind);
  const baseName = template?.name ?? "Fixture";
  const existing = fixtures.filter((f) => f.kind === kind);
  return `${baseName} ${existing.length + 1}`;
}
