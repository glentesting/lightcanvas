import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getAIProvider } from "@/lib/ai";
import { aiGenerateSchema } from "@/lib/schemas/ai";

export const POST = withAuth(async (request) => {
  const body = await request.json();
  const parsed = aiGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const provider = getAIProvider();
  const encoder = new TextEncoder();
  const { style, refinementPrompt, existingBlocks, ...input } = parsed.data;

  const options = {
    style,
    refinementPrompt,
    existingBlocks,
    sections: input.audio.sections,
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of provider.generateFromMusic(input, options)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: String(e) })}\n\n`,
          ),
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
});
