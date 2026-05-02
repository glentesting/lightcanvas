import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;

  if (!file || !projectId) {
    return NextResponse.json({ error: "file and projectId required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify project ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Upload to Supabase Storage
  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/${projectId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("songs")
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from("songs").getPublicUrl(filePath);

  // Save metadata to database
  const { data: song, error: dbError } = await supabase
    .from("songs")
    .insert({
      project_id: projectId,
      file_url: urlData.publicUrl,
      duration_seconds: null,
      bpm: null,
      analysis_json: null,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json(song, { status: 201 });
}
