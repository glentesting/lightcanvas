import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateImageFile } from "@/lib/schemas/audio";

export const POST = withAuth(async (request, { userId, supabase }) => {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;

  if (!file || !projectId) {
    return NextResponse.json({ error: "file and projectId required" }, { status: 400 });
  }

  const fileError = validateImageFile(file);
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

  // Upload to Supabase Storage — use "lightcanvas-images" bucket
  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/${projectId}/house.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("lightcanvas-images")
    .upload(filePath, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("lightcanvas-images")
    .getPublicUrl(filePath);

  // Update project with custom house photo URL
  await supabase
    .from("projects")
    .update({ house_custom_svg: urlData.publicUrl })
    .eq("id", projectId);

  return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
});
