import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";

const importSchema = z.object({
  name: z.string().min(1).max(200),
  fixtures: z.array(z.object({ id: z.string() }).passthrough()).min(1),
  groups: z.array(z.object({ id: z.string() }).passthrough()).optional(),
  sequence: z.object({
    tracks: z.array(z.object({ id: z.string() }).passthrough()),
    blocks: z.array(z.object({ id: z.string() }).passthrough()),
    bpm: z.number(),
    beatGridOffset: z.number(),
    xlightsNameMap: z.record(z.string(), z.string()).optional(),
  }).optional(),
  audio: z.any().nullable().optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const body = await request.json();
  const parsed = importSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, fixtures, groups, sequence, audio } = parsed.data;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: userId,
      name,
      fixtures,
      groups: groups ?? [],
      sequence: sequence ?? { tracks: [], blocks: [], bpm: 120, beatGridOffset: 0 },
      audio: audio ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/import]", error);
    return NextResponse.json({ error: "Failed to import project" }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
