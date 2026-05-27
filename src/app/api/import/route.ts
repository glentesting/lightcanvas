import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { projectImportSchema } from "@/lib/schemas/projects";

export const POST = withAuth(async (request, { userId, supabase }) => {
  const body = await request.json();
  const parsed = projectImportSchema.safeParse(body);
  if (!parsed.success) {
    // Preserve original messages for compatibility
    if (!body?.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!Array.isArray(body.fixtures) || body.fixtures.length === 0) {
      return NextResponse.json(
        { error: "At least one fixture is required" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { name, fixtures, sequence, audio } = parsed.data;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: userId,
      name: name || "Imported Project",
      fixtures,
      sequence: sequence || { tracks: [], blocks: [], bpm: 120, beatGridOffset: 0 },
      audio: audio || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
});
