/**
 * Layer 1 output schema: the musical direction the model returns, one compact
 * plan per song section. The model never emits effect blocks — code does
 * (see expander.ts). A section plan is a few hundred tokens; the deterministic
 * expander turns it into hundreds of beat-snapped blocks.
 */

import { z } from "zod";

export const PLAN_EFFECTS = [
  "twinkle", "chase", "fade", "strobe", "sparkle",
  "wave", "pulse", "wash", "meteor", "firework",
] as const;

export const RHYTHMS = [
  /** one long block per fixture spanning the section (split at phrase boundaries) */
  "sustained",
  /** an accent on every detected beat */
  "every-beat",
  /** an accent on every other beat */
  "every-2-beats",
  /** accents on downbeats only (the "1" of each bar) */
  "downbeats",
  /** accents on the backbeat (the "3" of each bar) */
  "offbeats",
] as const;

export const MOVEMENTS = [
  /** all fixtures in the group fire together */
  "unison",
  /** accents travel across the group, one fixture per beat */
  "left-to-right",
  "right-to-left",
  /** each fixture's pattern starts one beat later than its neighbor */
  "stagger",
  /** odd/even fixtures alternate beats */
  "alternate",
  /** accents radiate outward in pairs from the middle of the group */
  "center-out",
] as const;

export const TRANSITIONS = ["none", "flash", "sweep", "blackout"] as const;

const hexColor = z
  .string()
  .regex(/^#?[0-9a-fA-F]{6}$/)
  .transform((s) => (s.startsWith("#") ? s.toLowerCase() : `#${s.toLowerCase()}`));

export const groupPlanSchema = z.object({
  /** key from the fixture-group list given in the prompt */
  group: z.string().min(1),
  effect: z.enum(PLAN_EFFECTS),
  rhythm: z.enum(RHYTHMS),
  movement: z.enum(MOVEMENTS).optional(),
  color1: hexColor,
  color2: hexColor.optional(),
  intensity: z.number().min(0).max(1).optional(),
  speed: z.number().min(0.1).max(5).optional(),
});

export const sectionPlanSchema = z.object({
  /** echo of the section index from the prompt */
  section: z.number().int().min(0),
  /** how hard this section pushes, 0–1; scales density and brightness */
  energy: z.number().min(0).max(1),
  /** what each active fixture group does; groups omitted here stay dark */
  groups: z.array(z.unknown()).min(1),
  /** moment at the section boundary into the NEXT section */
  transition: z.enum(TRANSITIONS).optional(),
});

export type GroupPlan = z.infer<typeof groupPlanSchema>;

export interface SectionPlan {
  section: number;
  energy: number;
  groups: GroupPlan[];
  transition?: (typeof TRANSITIONS)[number];
}

export interface PlanSalvageReport {
  droppedSections: number;
  droppedGroups: number;
  problems: string[];
}

/**
 * Lenient parse of a model response: invalid group entries are dropped
 * individually, invalid section entries are dropped whole, valid ones
 * survive. Never throws on shape problems — returns what could be salvaged.
 */
export function salvagePlans(parsed: unknown): { plans: SectionPlan[]; report: PlanSalvageReport } {
  const report: PlanSalvageReport = { droppedSections: 0, droppedGroups: 0, problems: [] };
  const plans: SectionPlan[] = [];
  if (!Array.isArray(parsed)) {
    report.problems.push("response is not a JSON array");
    return { plans, report };
  }
  for (const item of parsed) {
    const sec = sectionPlanSchema.safeParse(item);
    if (!sec.success) {
      report.droppedSections++;
      report.problems.push(`section entry dropped: ${sec.error.issues[0]?.message ?? "invalid"}`);
      continue;
    }
    const groups: GroupPlan[] = [];
    for (const g of sec.data.groups) {
      const gp = groupPlanSchema.safeParse(g);
      if (gp.success) groups.push(gp.data);
      else report.droppedGroups++;
    }
    if (groups.length === 0) {
      report.droppedSections++;
      report.problems.push(`section ${sec.data.section}: all group entries invalid`);
      continue;
    }
    plans.push({ ...sec.data, groups });
  }
  return { plans, report };
}
