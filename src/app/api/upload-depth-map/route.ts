import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * Persists the client-computed depth map PNG next to the house photo in
 * lightcanvas-images. The night-stage derives the depth URL from the photo
 * URL by convention (last path segment → depth.png; no DB column), so the
 * upload path is derived the same way from the project's stored photo URL —
 * this keeps photos uploaded under the old Clerk-userId prefix working.
 */
export async function POST(request: Request) {
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
    .select("id, house_custom_svg")
    .eq("id", projectId)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  let filePath = `local/${projectId}/depth.png`;
  const photoUrl: string | null = project.house_custom_svg;
  const marker = "/lightcanvas-images/";
  if (photoUrl && photoUrl.includes(marker)) {
    const segments = photoUrl.split(marker)[1].split("/");
    segments[segments.length - 1] = "depth.png";
    filePath = segments.join("/");
  }

  const { error: uploadError } = await supabase.storage
    .from("lightcanvas-images")
    .upload(filePath, file, { contentType: "image/png", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("lightcanvas-images").getPublicUrl(filePath);
  return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
}
