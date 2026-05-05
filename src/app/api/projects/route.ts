import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { createDefaultFixtures } from "@/lib/fixtures/defaults";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, owner_id, audio_file, fixtures, created_at, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const fixtures = createDefaultFixtures();
  const tracks = fixtures.map((f) => ({ id: f.id, kind: "fixture" as const }));

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: userId,
      name,
      fixtures,
      sequence: { tracks, blocks: [], bpm: 120, beatGridOffset: 0 },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
