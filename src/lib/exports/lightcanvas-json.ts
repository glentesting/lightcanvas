import { z } from "zod";
import type { Project } from "@/types/domain";

const SCHEMA_VERSION = "1.0.0";

/**
 * Export a project as a LightCanvas JSON blob.
 */
export function exportLightCanvasJson(project: Project): Blob {
  const payload = {
    $schema: "https://lightcanvas.app/schemas/project-v1.json",
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project: {
      name: project.name,
      audio: project.audio,
      audioFile: project.audioFile,
      fixtures: project.fixtures,
      groups: project.groups,
      sequence: project.sequence,
      houseTemplate: project.houseTemplate,
    },
  };
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
}

/* ── Zod schema for import validation ── */

const EasingSchema = z.enum(["linear", "ease-in", "ease-out", "ease-in-out"]);

const EffectParamsSchema = z.object({
  color1: z.string(),
  color2: z.string().optional(),
  intensity: z.number(),
  speed: z.number(),
  easing: EasingSchema,
  density: z.number().optional(),
  direction: z
    .enum(["forward", "backward", "center-out", "in"])
    .optional(),
  trailLength: z.number().optional(),
  burstCount: z.number().optional(),
});

const EffectBlockSchema = z.object({
  id: z.string(),
  trackId: z.string(),
  effectId: z.string(),
  start: z.number(),
  duration: z.number(),
  params: EffectParamsSchema,
  locked: z.boolean().optional(),
});

const TrackSchema = z.object({
  id: z.string(),
  kind: z.enum(["fixture", "group"]),
  collapsed: z.boolean().optional(),
  height: z.number().optional(),
});

const SequenceSchema = z.object({
  tracks: z.array(TrackSchema),
  blocks: z.array(EffectBlockSchema),
  bpm: z.number(),
  beatGridOffset: z.number(),
});

const FixtureSchema = z.object({
  id: z.string(),
  kind: z.string(),
  name: z.string(),
  pixelCount: z.number(),
  startChannel: z.number(),
  layout: z
    .object({
      points: z.array(z.object({ x: z.number(), y: z.number() })),
      closed: z.boolean().optional(),
    })
    .optional(),
  groupId: z.string().optional(),
});

const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  fixtureIds: z.array(z.string()),
});

const AudioAnalysisSchema = z.object({
  duration: z.number(),
  bpm: z.number(),
  beats: z.array(z.number()),
  downbeats: z.array(z.number()),
  onsets: z.array(z.number()),
  loudness: z.array(z.object({ t: z.number(), v: z.number() })),
});

const LightCanvasFileSchema = z.object({
  $schema: z.string().optional(),
  version: z.string(),
  exportedAt: z.string().optional(),
  project: z.object({
    name: z.string(),
    audio: AudioAnalysisSchema.nullable(),
    audioFile: z.string().nullable(),
    fixtures: z.array(FixtureSchema),
    groups: z.array(GroupSchema),
    sequence: SequenceSchema,
    houseTemplate: z.string(),
  }),
});

export type LightCanvasFile = z.infer<typeof LightCanvasFileSchema>;

/**
 * Import a LightCanvas JSON file, validating with zod.
 * Returns the parsed project data or throws on invalid input.
 */
export function importLightCanvasJson(json: string): LightCanvasFile {
  const raw = JSON.parse(json);
  return LightCanvasFileSchema.parse(raw);
}
