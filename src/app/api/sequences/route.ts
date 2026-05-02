import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const supabase = createServiceClient();

  // Verify project ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("sequences")
    .select("*, effect_blocks(*)")
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { projectId, songId, name, effectBlocks } = body;

  if (!projectId || !name) {
    return NextResponse.json({ error: "projectId and name required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify project ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Create sequence
  const { data: sequence, error: seqError } = await supabase
    .from("sequences")
    .insert({ project_id: projectId, song_id: songId || null, name })
    .select()
    .single();

  if (seqError) return NextResponse.json({ error: seqError.message }, { status: 500 });

  // Insert effect blocks if provided
  if (effectBlocks && effectBlocks.length > 0) {
    const blocks = effectBlocks.map((b: { fixture_id?: string; start_time_ms: number; end_time_ms: number; effect_type: string; params?: object }) => ({
      sequence_id: sequence.id,
      fixture_id: b.fixture_id || null,
      start_time_ms: b.start_time_ms,
      end_time_ms: b.end_time_ms,
      effect_type: b.effect_type,
      params: b.params || null,
    }));

    const { error: blockError } = await supabase.from("effect_blocks").insert(blocks);
    if (blockError) return NextResponse.json({ error: blockError.message }, { status: 500 });
  }

  return NextResponse.json(sequence, { status: 201 });
}
