import type { Fixture } from "@/lib/fixtures/types";

export interface ValidationIssue {
  type: "warning" | "error";
  category: "channel-overlap" | "universe-overflow" | "controller-limit";
  message: string;
  details?: string;
}

const CONTROLLER_LIMITS: Record<string, { name: string; maxPixels: number }> = {
  falcon_f16v3: { name: "Falcon F16v3", maxPixels: 1700 },
  alphapix: { name: "AlphaPix 16", maxPixels: 680 },
  pixcon16: { name: "LOR PixCon16", maxPixels: 170 },
};

export function validateFixtures(
  fixtures: Fixture[],
  controllerType?: string | null
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Channel overlap detection
  for (let i = 0; i < fixtures.length; i++) {
    for (let j = i + 1; j < fixtures.length; j++) {
      const a = fixtures[i], b = fixtures[j];
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

  // 2. Universe overflow
  const universeChannels = new Map<number, { total: number; fixtures: string[] }>();
  for (const f of fixtures) {
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
