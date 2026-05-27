import { z } from "zod";

/** POST /api/ai/generate — audio-analysis driven generation request */
export const aiGenerateSchema = z.object({
  audio: z.object({
    duration: z.number(),
    bpm: z.number(),
    beats: z.array(z.number()),
    downbeats: z.array(z.number()),
    onsets: z.array(z.number()),
    loudness: z.array(z.object({ t: z.number(), v: z.number() })),
    sections: z
      .array(
        z.object({
          label: z.enum(["intro", "verse", "chorus", "bridge", "outro"]),
          startTime: z.number(),
          endTime: z.number(),
          avgEnergy: z.number(),
        }),
      )
      .optional(),
    spectralFeatures: z
      .object({
        bassEnergy: z.array(z.number()),
        highEnergy: z.array(z.number()),
      })
      .optional(),
  }),
  fixtures: z.array(z.any()),
  vibe: z.enum(["classic", "jazz", "edm", "cinematic", "whimsical"]),
  intensity: z.enum(["subtle", "balanced", "wild"]),
  style: z.string().optional(),
  refinementPrompt: z.string().optional(),
  existingBlocks: z.array(z.any()).optional(),
});

export type AIGenerateInput = z.infer<typeof aiGenerateSchema>;

/** POST /api/onboarding — initial onboarding submit */
export const onboardingSubmitSchema = z.object({
  decorating: z.enum(["house", "yard", "both"]).optional(),
  lightCount: z.number().int().min(100).max(10000).optional(),
  sequencer: z.enum(["xlights", "lor", "vixen", "other"]).optional(),
});

/** PATCH /api/onboarding — update hardware settings */
export const onboardingPatchSchema = z.object({
  sequencer: z.enum(["xlights", "lor", "vixen", "other"]).optional(),
  controllerType: z
    .enum(["falcon-f16v3", "alphapix-16", "wled-esp32", "lor-controller", "other"])
    .optional(),
});
