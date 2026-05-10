export interface EffectPreset {
  id: string;
  name: string;
  effectType: string; // EffectId
  parameters: Record<string, unknown>; // explicit, complete params
  version: number;
  compatibleFixtureTypes: string[]; // fixture kinds this works well with
  tags: string[]; // category tags like "color", "motion", "texture"
  createdAt: string;
  isSystem: boolean;
  userId?: string; // null for system presets
}
