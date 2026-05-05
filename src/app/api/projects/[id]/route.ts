import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("owner_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch project first to get audio info for cleanup
  const { data: project } = await supabase
    .from("projects")
    .select("audio_url")
    .eq("id", id)
    .eq("owner_id", userId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete audio file from storage if it exists
  if (project.audio_url) {
    // Extract path from URL — handles both bucket formats
    const urlPath = project.audio_url.split("/storage/v1/object/")[1];
    if (urlPath) {
      // urlPath is like "sign/bucket/path" or "public/bucket/path"
      const parts = urlPath.split("/");
      const bucket = parts[1];
      const filePath = parts.slice(2).join("/");
      if (bucket && filePath) {
        await supabase.storage.from(bucket).remove([filePath]);
      }
    }
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  if (body.action !== "duplicate") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch the original project
  const { data: original, error: fetchErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", userId)
    .single();

  if (fetchErr || !original) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Insert a copy (new id, no audio — user can re-upload)
  const { data: copy, error: insertErr } = await supabase
    .from("projects")
    .insert({
      owner_id: userId,
      name: `${original.name} (Copy)`,
      fixtures: original.fixtures,
      groups: original.groups,
      sequence: original.sequence,
      audio: original.audio,
      house_template: original.house_template,
      house_custom_svg: original.house_custom_svg,
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  return NextResponse.json(copy, { status: 201 });
}
