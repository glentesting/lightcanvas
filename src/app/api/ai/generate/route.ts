import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { z } from "zod";

const generateSchema = z.object({
  audio: z.object({
    duration: z.number(),
    bpm: z.number(),
    beats: z.array(z.number()),
    downbeats: z.array(z.number()),
    onsets: z.array(z.number()),
    loudness: z.array(z.object({ t: z.number(), v: z.number() })),
  }),
  fixtures: z.array(z.any()),
  vibe: z.enum(["classic", "jazz", "edm", "cinematic", "whimsical"]),
  intensity: z.enum(["subtle", "balanced", "wild"]),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const provider = getAIProvider();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of provider.generateFromMusic(parsed.data)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: String(e) })}\n\n`)
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
