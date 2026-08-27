import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Upload to Supabase Storage
  const bucket = "songs"; // Use existing bucket; switch to "lightcanvas-audio" once created
  const fileExt = file.name.split(".").pop();
  const filePath = `local/${projectId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Store the bucket path (not the public URL) so we can generate signed URLs on demand
  const storagePath = `${bucket}/${filePath}`;

  // Update project row with audio info
  const { error: dbError } = await supabase
    .from("projects")
    .update({ audio_url: storagePath, audio_file: file.name })
    .eq("id", projectId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ file_url: storagePath, file_name: file.name }, { status: 201 });
}
