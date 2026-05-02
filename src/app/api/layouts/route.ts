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
    .from("layouts")
    .select("*, fixtures(*)")
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { projectId, backgroundImageUrl, fixtures } = body;

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

  // Create layout
  const { data: layout, error: layoutError } = await supabase
    .from("layouts")
    .insert({ project_id: projectId, background_image_url: backgroundImageUrl || null })
    .select()
    .single();

  if (layoutError) return NextResponse.json({ error: layoutError.message }, { status: 500 });

  // Insert fixtures if provided
  if (fixtures && fixtures.length > 0) {
    const fixtureRows = fixtures.map((f: { name: string; type: string; coordinates: object; channel_start?: number; channel_end?: number }) => ({
      layout_id: layout.id,
      name: f.name,
      type: f.type,
      coordinates: f.coordinates,
      channel_start: f.channel_start ?? null,
      channel_end: f.channel_end ?? null,
    }));

    const { error: fixtureError } = await supabase.from("fixtures").insert(fixtureRows);
    if (fixtureError) return NextResponse.json({ error: fixtureError.message }, { status: 500 });
  }

  return NextResponse.json(layout, { status: 201 });
}
