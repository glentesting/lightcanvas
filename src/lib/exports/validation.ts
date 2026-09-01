import type { Fixture } from "@/lib/fixtures/types";

export interface ValidationIssue {
  type: "warning" | "error";
  category: "channel-overlap" | "universe-overflow" | "controller-limit";
  message: string;
  details?: string;
}

// Keys are kebab-case to match the values callers actually pass — the old
// snake_case keys (falcon_f16v3) never matched anything, so the port-limit
// check could never fire.
const CONTROLLER_LIMITS: Record<string, { name: string; maxPixels: number }> = {
  "falcon-f16v3": { name: "Falcon F16v3", maxPixels: 1700 },
  "alphapix": { name: "AlphaPix 16", maxPixels: 680 },
  "pixcon16": { name: "LOR PixCon16", maxPixels: 170 },
  // The owner's controllers: each Pixie16 port drives at most 100 pixels in
  // the RGBPlus layout (mini tree base+star = 300 channels; hardware ref §5)
  "lor-pixie16": { name: "LOR Pixie16", maxPixels: 100 },
};

export function validateFixtures(
  fixtures: Fixture[],
  controllerType?: string | null
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Wiring conflicts. Two different addressing systems, never compared
  //    against each other (see LayoutEditor.tsx, which applies the same rule):
  //     - Fixtures imported from Light-O-Rama address by controller unit
  //       (network + unit + circuit range). Comparing their raw start channels
  //       across units is meaningless and once flooded the UI with 1,562 false
  //       "overlaps".
  //     - Hand-made fixtures keep the legacy universe/channel comparison,
  //       among themselves only.
  const lorFixtures = fixtures.filter((f) => f.lor);
  const byUnit = new Map<string, Fixture[]>();
  for (const f of lorFixtures) {
    const key = `${f.lor!.network}|${f.lor!.unit}`;
    const arr = byUnit.get(key) ?? [];
    arr.push(f);
    byUnit.set(key, arr);
  }
  for (const group of byUnit.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        const aEnd = a.lor!.startCircuit + a.lor!.channelCount - 1;
        const bEnd = b.lor!.startCircuit + b.lor!.channelCount - 1;
        if (a.lor!.startCircuit <= bEnd && b.lor!.startCircuit <= aEnd) {
          issues.push({
            type: "warning",
            category: "channel-overlap",
            message: `${a.name} and ${b.name} share plugs on controller unit ${a.lor!.unit}`,
            details:
              "Fix in Layout before exporting to avoid flickering or wrong colors on hardware.",
          });
        }
      }
    }
  }

  const plainFixtures = fixtures.filter((f) => !f.lor);
  for (let i = 0; i < plainFixtures.length; i++) {
    for (let j = i + 1; j < plainFixtures.length; j++) {
      const a = plainFixtures[i], b = plainFixtures[j];
      const aUni = a.universe ?? 1, bUni = b.universe ?? 1;
      if (aUni !== bUni) continue;
      const aStart = a.startChannel;
      const aEnd = a.startChannel + (a.pixelCount * 3) - 1;
      const bStart = b.startChannel;
      const bEnd = b.startChannel + (b.pixelCount * 3) - 1;
      const overlapStart = Math.max(aStart, bStart);
      const overlapEnd = Math.min(aEnd, bEnd);
      if (overlapStart <= overlapEnd) {
        issues.push({
          type: "warning",
          category: "channel-overlap",
          message: `${a.name} and ${b.name} share channels ${overlapStart}\u2013${overlapEnd} on Universe ${aUni}`,
          details:
            "Fix in Layout before exporting to avoid flickering or wrong colors on hardware.",
        });
      }
    }
  }

  // 2. Universe overflow \u2014 a DMX/E1.31 concept. LOR-addressed fixtures are not
  //    on universes at all, so counting them here would invent a problem.
  const universeChannels = new Map<number, { total: number; fixtures: string[] }>();
  for (const f of plainFixtures) {
    const uni = f.universe ?? 1;
    const channels = f.pixelCount * 3;
    const entry = universeChannels.get(uni) || { total: 0, fixtures: [] };
    entry.total += channels;
    entry.fixtures.push(f.name);
    universeChannels.set(uni, entry);
  }
  for (const [uni, data] of universeChannels) {
    if (data.total > 510) {
      issues.push({
        type: "warning",
        category: "universe-overflow",
        message: `Universe ${uni} contains ${data.total} channels \u2014 exceeds the 510 channel limit`,
        details: `Fixtures: ${data.fixtures.join(", ")}. Move some fixtures to a new universe.`,
      });
    }
  }

  // 3. Controller port limit
  if (controllerType && CONTROLLER_LIMITS[controllerType]) {
    const limit = CONTROLLER_LIMITS[controllerType];
    for (const f of fixtures) {
      if (f.pixelCount > limit.maxPixels) {
        issues.push({
          type: "warning",
          category: "controller-limit",
          message: `${f.name} (${f.pixelCount} pixels) exceeds the ${limit.name} port limit of ${limit.maxPixels} pixels`,
          details:
            "Split this fixture across multiple ports in your controller software.",
        });
      }
    }
  }

  return issues;
}
