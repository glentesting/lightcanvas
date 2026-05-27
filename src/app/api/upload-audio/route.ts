import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateAudioFile } from "@/lib/schemas/audio";

// The `songs` bucket was created out-of-band (pre-migration) and is the
// canonical audio bucket. Migration 005 codifies it; the older `lumen-audio`
// bucket from migration 002 is deprecated and unused.
const AUDIO_BUCKET = "songs";

export const POST = withAuth(async (request, { userId, supabase }) => {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;

  if (!file || !projectId) {
    return NextResponse.json({ error: "file and projectId required" }, { status: 400 });
  }

  const fileError = validateAudioFile(file);
  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 400 });
  }

  // Verify project ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/${projectId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Store the bucket path (not the public URL) so we can generate signed URLs on demand
  const storagePath = `${AUDIO_BUCKET}/${filePath}`;

  // Update project row with audio info
  const { error: dbError } = await supabase
    .from("projects")
    .update({ audio_url: storagePath, audio_file: file.name })
    .eq("id", projectId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ file_url: storagePath, file_name: file.name }, { status: 201 });
});
