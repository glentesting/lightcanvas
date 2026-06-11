import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * Persists the client-computed depth map PNG next to the house photo
 * (`{userId}/{projectId}/depth.png` in lightcanvas-images). The night-stage
 * derives this URL from the photo URL by convention — no DB column involved.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;

  if (!file || !projectId) {
    return NextResponse.json({ error: "file and projectId required" }, { status: 400 });
  }
  if (file.type !== "image/png") {
    return NextResponse.json({ error: "Depth map must be a PNG" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const filePath = `${userId}/${projectId}/depth.png`;
  const { error: uploadError } = await supabase.storage
    .from("lightcanvas-images")
    .upload(filePath, file, { contentType: "image/png", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("lightcanvas-images").getPublicUrl(filePath);
  return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
}
