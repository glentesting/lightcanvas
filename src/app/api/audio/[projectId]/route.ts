import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = createServiceClient();

  // Get project and verify ownership
  const { data: project } = await supabase
    .from("projects")
    .select("audio_url")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .single();

  if (!project || !project.audio_url) {
    console.log("[audio] No project or audio_url found", { projectId, userId });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const audioUrl = project.audio_url as string;
  console.log("[audio] audio_url from DB:", audioUrl);

  // Determine bucket and path
  let bucket: string;
  let filePath: string;

  if (audioUrl.startsWith("http")) {
    const match = audioUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) {
      console.log("[audio] Cannot parse full URL:", audioUrl);
      return NextResponse.json({ error: "Cannot parse audio URL" }, { status: 500 });
    }
    bucket = match[1];
    filePath = match[2];
  } else {
    const slashIndex = audioUrl.indexOf("/");
    bucket = audioUrl.substring(0, slashIndex);
    filePath = audioUrl.substring(slashIndex + 1);
  }

  console.log("[audio] Resolved bucket:", bucket, "filePath:", filePath);

  // Try signed URL first
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600);

  if (error || !data?.signedUrl) {
    console.log("[audio] createSignedUrl FAILED:", {
      errorMessage: error?.message,
      errorName: (error as any)?.name,
      errorStatus: (error as any)?.status,
      errorFull: JSON.stringify(error),
      bucket,
      filePath,
    });

    // Fallback: return public URL directly (songs bucket is public)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
    console.log("[audio] Falling back to public URL:", publicUrl);
    return NextResponse.redirect(publicUrl);
  }

  console.log("[audio] Signed URL generated successfully");
  return NextResponse.redirect(data.signedUrl);
}
