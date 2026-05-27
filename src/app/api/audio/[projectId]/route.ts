import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

const ALLOWED_BUCKETS = ["songs", "lightcanvas-images"] as const;

function isAllowedBucket(bucket: string): boolean {
  return (ALLOWED_BUCKETS as readonly string[]).includes(bucket);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = createServiceClient();

  const { data: project } = await supabase
    .from("projects")
    .select("audio_url")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .single();

  if (!project || !project.audio_url) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const audioUrl = project.audio_url as string;

  // Parse bucket and path from stored audio_url
  // Format is either "bucket/path" or a full Supabase URL
  let bucket: string;
  let filePath: string;

  if (audioUrl.startsWith("http")) {
    const match = audioUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Invalid audio URL" }, { status: 400 });
    }
    bucket = match[1];
    filePath = match[2];
  } else {
    const slashIndex = audioUrl.indexOf("/");
    if (slashIndex === -1) {
      return NextResponse.json({ error: "Invalid audio URL" }, { status: 400 });
    }
    bucket = audioUrl.substring(0, slashIndex);
    filePath = audioUrl.substring(slashIndex + 1);
  }

  if (!isAllowedBucket(bucket)) {
    console.error("[GET /api/audio/:projectId] Rejected disallowed bucket:", bucket);
    return NextResponse.json({ error: "Invalid audio URL" }, { status: 400 });
  }

  // Generate signed URL (songs bucket is public, but signed is cleaner)
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600);

  if (error || !data?.signedUrl) {
    // Fallback to public URL for the songs bucket
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
    return NextResponse.redirect(publicUrl);
  }

  return NextResponse.redirect(data.signedUrl);
}
