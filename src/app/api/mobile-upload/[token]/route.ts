import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function isHeic(file: File) {
  const t = file.type.toLowerCase();
  const n = file.name.toLowerCase();
  return t === "image/heic" || t === "image/heif" || n.endsWith(".heic") || n.endsWith(".heif");
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const supabase = createServiceClient();
  const { data: session } = await supabase
    .from("upload_sessions")
    .select("id, status, expires_at, kind")
    .eq("token", token)
    .single();

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const expired = new Date(session.expires_at).getTime() < Date.now();
  return NextResponse.json({
    status: expired ? "expired" : session.status,
    expiresAt: session.expires_at,
    kind: session.kind,
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from("upload_sessions")
    .select("id, owner_id, project_id, status, expires_at")
    .eq("token", token)
    .single();
  if (!session) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  if (session.status !== "pending") {
    return NextResponse.json({ error: "Session already used" }, { status: 409 });
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await supabase.from("upload_sessions").update({ status: "expired" }).eq("id", session.id);
    return NextResponse.json({ error: "Session expired" }, { status: 410 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  if (isHeic(file)) {
    return NextResponse.json(
      {
        error:
          "HEIC files aren't supported yet. On iPhone: Settings → Camera → Formats → Most Compatible, or use the 'Take photo' button which saves as JPEG.",
      },
      { status: 415 },
    );
  }
  if (!ALLOWED_TYPES.has(file.type.toLowerCase()) && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only JPG, PNG, or WebP allowed" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 413 });
  }

  const extFromName = file.name.split(".").pop()?.toLowerCase();
  const ext = extFromName && extFromName.length <= 5 ? extFromName : "jpg";
  const filePath = `${session.owner_id}/${session.project_id}/house.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("lightcanvas-images")
    .upload(filePath, file, { contentType: file.type, upsert: true });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("lightcanvas-images").getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl;

  await supabase
    .from("projects")
    .update({ house_custom_svg: publicUrl })
    .eq("id", session.project_id);

  // This update is what the desktop is listening for via Supabase Realtime.
  await supabase
    .from("upload_sessions")
    .update({ status: "uploaded", photo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", session.id);

  return NextResponse.json({ ok: true, url: publicUrl });
}
