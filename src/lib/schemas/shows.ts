import { z } from "zod";

/** POST /api/shows — create a new show */
export const showCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  season_year: z.number().int().optional(),
});

/** PATCH /api/shows/[id] — update mutable fields */
export const showPatchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().nullable().optional(),
    season_year: z.number().int().optional(),
    is_active: z.boolean().optional(),
    song_order: z.array(z.string()).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "No valid fields to update",
  });

/** POST /api/shows/[id] — assign-/unassign-project action */
export const showActionSchema = z.object({
  action: z.enum(["assign-project", "unassign-project"]),
  project_id: z.string().min(1),
});
