import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { projectAutosaveSchema } from "@/lib/schemas/projects";

type Params = { id: string };

export const POST = withAuth<Params>(async (request, { userId, supabase, params }) => {
  const body = await request.json();
  const parsed = projectAutosaveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

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
    .eq("id", params.id)
    .eq("owner_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
});
