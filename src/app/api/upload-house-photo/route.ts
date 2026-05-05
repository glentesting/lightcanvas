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

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
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

  // Upload to Supabase Storage — use "songs" bucket for now (it exists)
  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/${projectId}/house.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("songs")
    .upload(filePath, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from("songs").getPublicUrl(filePath);

  // Update project with custom house photo URL
  await supabase
    .from("projects")
    .update({ house_custom_svg: urlData.publicUrl })
    .eq("id", projectId);

  return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
}
