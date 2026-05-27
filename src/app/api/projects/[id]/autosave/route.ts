import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";

const AUDIO_URL_RE = /^(songs|lightcanvas-images)\/[A-Za-z0-9_\-./]+$/;

const autosaveSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  audioUrl: z.string().regex(AUDIO_URL_RE).nullable().optional(),
  audioFile: z.string().nullable().optional(),
  audio: z.any().nullable().optional(),
  fixtures: z.array(z.object({ id: z.string() }).passthrough()).optional(),
  groups: z.array(z.object({ id: z.string() }).passthrough()).optional(),
  sequence: z.object({
    tracks: z.array(z.object({ id: z.string() }).passthrough()),
    blocks: z.array(z.object({ id: z.string() }).passthrough()),
    bpm: z.number(),
    beatGridOffset: z.number(),
    xlightsNameMap: z.record(z.string(), z.string()).optional(),
  }).optional(),
  houseTemplate: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const body = await request.json();
  const parsed = autosaveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const supabase = createServiceClient();

  // Build the update object, mapping camelCase to snake_case
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.audioUrl !== undefined) update.audio_url = data.audioUrl;
  if (data.audioFile !== undefined) update.audio_file = data.audioFile;
  if (data.audio !== undefined) update.audio = data.audio;
  if (data.fixtures !== undefined) update.fixtures = data.fixtures;
  if (data.groups !== undefined) update.groups = data.groups;
  if (data.sequence !== undefined) update.sequence = data.sequence;
  if (data.houseTemplate !== undefined) update.house_template = data.houseTemplate;

  const { error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", id)
    .eq("owner_id", userId);

  if (error) {
    console.error("[POST /api/projects/:id/autosave]", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
