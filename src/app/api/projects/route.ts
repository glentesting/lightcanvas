import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { createDefaultFixtures } from "@/lib/fixtures/defaults";
import { projectCreateSchema } from "@/lib/schemas/projects";

export const GET = withAuth(async (_req, { userId, supabase }) => {
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, name, owner_id, audio_file, fixtures, parent_show_id, house_custom_svg, created_at, updated_at",
    )
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});

export const POST = withAuth(async (request, { userId, supabase }) => {
  const body = await request.json();
  const parsed = projectCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const fixtures = createDefaultFixtures();
  const tracks = fixtures.map((f) => ({ id: f.id, kind: "fixture" as const }));

  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: userId,
      name: parsed.data.name,
      fixtures,
      sequence: { tracks, blocks: [], bpm: 120, beatGridOffset: 0 },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
});
