import type { Fixture } from "@/lib/fixtures/types";

/**
 * Compute the list of layout issue messages for a set of fixtures.
 * - Reports props without placement.
 * - Reports channel overlaps within the same universe.
 */
export function computeIssuesList(fixtures: Fixture[]): string[] {
  const issues: string[] = [];
  const fixturesWithoutLayout = fixtures.filter((f) => !f.layout?.points.length);
  if (fixturesWithoutLayout.length > 0) {
    issues.push(`${fixturesWithoutLayout.length} prop${fixturesWithoutLayout.length > 1 ? "s" : ""} need${fixturesWithoutLayout.length === 1 ? "s" : ""} placement`);
  }
  // Check for channel overlaps
  for (let i = 0; i < fixtures.length; i++) {
    for (let j = i + 1; j < fixtures.length; j++) {
      const a = fixtures[i];
      const b = fixtures[j];
      if ((a.universe ?? 1) === (b.universe ?? 1)) {
        const aEnd = a.startChannel + a.pixelCount * 3 - 1;
        const bEnd = b.startChannel + b.pixelCount * 3 - 1;
        if (a.startChannel <= bEnd && b.startChannel <= aEnd) {
          issues.push(`Channel overlap: ${a.name} / ${b.name}`);
        }
      }
    }
  }
  return issues;
}

/**
 * Compute layout readiness percentage (0-100).
 * Placement contributes 70%, no-overlap contributes 30%.
 */
export function computeLayoutReadiness(fixtures: Fixture[], issuesList: string[]): number {
  if (fixtures.length === 0) return 0;
  const placed = fixtures.filter((f) => f.layout?.points.length).length;
  const noOverlap = issuesList.filter((i) => i.startsWith("Channel overlap")).length === 0;
  const placedPct = (placed / fixtures.length) * 70;
  const overlapPct = noOverlap ? 30 : 0;
  return Math.round(placedPct + overlapPct);
}
