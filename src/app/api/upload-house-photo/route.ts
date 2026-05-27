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

  // Validate file type — explicit allowlist; image/svg+xml excluded to prevent stored XSS
  const ALLOWED_IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify project ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Upload to Supabase Storage — use "lightcanvas-images" bucket for now (it exists)
  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/${projectId}/house.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("lightcanvas-images")
    .upload(filePath, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from("lightcanvas-images").getPublicUrl(filePath);

  // Update project with custom house photo URL — include owner_id to prevent TOCTOU race
  await supabase
    .from("projects")
    .update({ house_custom_svg: urlData.publicUrl })
    .eq("id", projectId)
    .eq("owner_id", userId);

  return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
}
