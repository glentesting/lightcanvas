import { z } from "zod";

/** POST /api/projects — create a new project from a name */
export const projectCreateSchema = z.object({
  name: z.string().min(1).max(200),
});

/** PATCH /api/projects/[id] — rename */
export const projectPatchSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

/** POST /api/projects/[id] — duplicate action */
export const projectActionSchema = z.object({
  action: z.literal("duplicate"),
});

/** POST /api/projects/[id]/autosave — full editor state save (partial) */
export const projectAutosaveSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  audioUrl: z.string().nullable().optional(),
  audioFile: z.string().nullable().optional(),
  audio: z.any().nullable().optional(),
  fixtures: z.array(z.any()).optional(),
  groups: z.array(z.any()).optional(),
  sequence: z
    .object({
      tracks: z.array(z.any()),
      blocks: z.array(z.any()),
      bpm: z.number(),
      beatGridOffset: z.number(),
      xlightsNameMap: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  houseTemplate: z.string().optional(),
});

export type ProjectAutosaveInput = z.infer<typeof projectAutosaveSchema>;

/** POST /api/import — imported project payload */
export const projectImportSchema = z.object({
  name: z.string().min(1),
  fixtures: z.array(z.any()).min(1),
  sequence: z
    .object({
      tracks: z.array(z.any()),
      blocks: z.array(z.any()),
      bpm: z.number(),
      beatGridOffset: z.number(),
    })
    .optional(),
  audio: z.any().optional(),
});

/** POST /api/export — export request */
export const projectExportSchema = z.object({
  projectId: z.string().min(1),
  format: z.enum(["lightcanvas-json", "xlights"]),
  nameMap: z.record(z.string(), z.string()).optional(),
  frameTimeMs: z.union([z.literal(20), z.literal(25), z.literal(40), z.literal(50)]).optional(),
});
