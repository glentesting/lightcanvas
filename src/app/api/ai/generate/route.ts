import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import type { GenerateInput, GenerateOptions } from "@/lib/ai/provider";
import { z } from "zod";

const generateSchema = z.object({
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
        })
      )
      .optional(),
    spectralFeatures: z
      .object({
        bassEnergy: z.array(z.number()),
        highEnergy: z.array(z.number()),
      })
      .optional(),
  }),
  fixtures: z.array(z.object({ id: z.string() }).passthrough()).max(500),
  vibe: z.enum(["classic", "jazz", "edm", "cinematic", "whimsical"]),
  intensity: z.enum(["subtle", "balanced", "wild"]),
  style: z.string().optional(),
  refinementPrompt: z.string().optional(),
  existingBlocks: z.array(z.object({ id: z.string() }).passthrough()).max(2000).optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  // Body size guard — reject payloads larger than 1 MB
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
    return new NextResponse("Request body too large", { status: 413 });
  }

  const body = await request.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const provider = getAIProvider();
  const encoder = new TextEncoder();
  const { style, refinementPrompt, existingBlocks, ...input } = parsed.data;

  const options: GenerateOptions = {
    style,
    refinementPrompt,
    existingBlocks: existingBlocks as GenerateOptions["existingBlocks"],
    sections: input.audio.sections,
    signal: request.signal,
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of provider.generateFromMusic(input as unknown as GenerateInput, options)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: String(e) })}\n\n`
          )
        );
      }
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
