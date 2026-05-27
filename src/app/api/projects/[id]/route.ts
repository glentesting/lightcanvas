import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

const ALLOWED_BUCKETS = ["songs", "lightcanvas-images"] as const;
type AllowedBucket = typeof ALLOWED_BUCKETS[number];

function isAllowedBucket(bucket: string): bucket is AllowedBucket {
  return (ALLOWED_BUCKETS as readonly string[]).includes(bucket);
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", userId)
    .single();

  if (error) {
    console.error("[GET /api/projects/:id]", error);
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("owner_id", userId)
    .select()
    .single();

  if (error) {
    console.error("[PATCH /api/projects/:id]", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch project first to get audio info for cleanup
  const { data: project } = await supabase
    .from("projects")
    .select("audio_url")
    .eq("id", id)
    .eq("owner_id", userId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete audio file from storage if it exists
  if (project.audio_url) {
    // Extract path from URL — handles both bucket formats
    const urlPath = project.audio_url.split("/storage/v1/object/")[1];
    if (urlPath) {
      // urlPath is like "sign/bucket/path" or "public/bucket/path"
      const parts = urlPath.split("/");
      const bucket = parts[1];
      const filePath = parts.slice(2).join("/");
      if (bucket && filePath && isAllowedBucket(bucket)) {
        await supabase.storage.from(bucket).remove([filePath]);
      } else if (bucket && !isAllowedBucket(bucket)) {
        console.error("[DELETE /api/projects/:id] Rejected disallowed bucket:", bucket);
      }
    } else {
      // Handle "bucket/path" short format (no /storage/v1/object/ prefix)
      const slashIndex = project.audio_url.indexOf("/");
      if (slashIndex !== -1) {
        const bucket = project.audio_url.substring(0, slashIndex);
        const filePath = project.audio_url.substring(slashIndex + 1);
        if (isAllowedBucket(bucket) && filePath) {
          await supabase.storage.from(bucket).remove([filePath]);
        } else if (!isAllowedBucket(bucket)) {
          console.error("[DELETE /api/projects/:id] Rejected disallowed bucket:", bucket);
        }
      }
    }
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId);

  if (error) {
    console.error("[DELETE /api/projects/:id]", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // ── Share / Unshare action ──────────────────────────────────────────────────
  if (body.action === "share") {
    const supabase = createServiceClient();
    const shareToken = crypto.randomUUID();
    const { data, error } = await supabase
      .from("projects")
      .update({ share_token: shareToken, shared_at: new Date().toISOString() })
      .eq("id", id)
      .eq("owner_id", userId)
      .select("share_token")
      .single();
    if (error || !data) {
      console.error("[POST /api/projects/:id share]", error);
      return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 });
    }
    return NextResponse.json({ share_token: data.share_token });
  }

  if (body.action === "unshare") {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("projects")
      .update({ share_token: null, shared_at: null })
      .eq("id", id)
      .eq("owner_id", userId);
    if (error) {
      console.error("[POST /api/projects/:id unshare]", error);
      return NextResponse.json({ error: "Failed to remove share link" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }
  // ── End share/unshare ───────────────────────────────────────────────────────

  if (body.action !== "duplicate") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch the original project
  const { data: original, error: fetchErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", userId)
    .single();

  if (fetchErr || !original) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Insert a copy (new id, no audio — user can re-upload)
  const { data: copy, error: insertErr } = await supabase
    .from("projects")
    .insert({
      owner_id: userId,
      name: `${original.name} (Copy)`,
      fixtures: original.fixtures,
      groups: original.groups,
      sequence: original.sequence,
      audio: original.audio,
      house_template: original.house_template,
      house_custom_svg: original.house_custom_svg,
    })
    .select()
    .single();

  if (insertErr) {
    console.error("[POST /api/projects/:id duplicate]", insertErr);
    return NextResponse.json({ error: "Failed to duplicate project" }, { status: 500 });
  }
  return NextResponse.json(copy, { status: 201 });
}
