import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const projectId = body?.projectId as string | undefined;
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const { data: session, error } = await supabase
    .from("upload_sessions")
    .insert({
      token,
      owner_id: userId,
      project_id: projectId,
      kind: "house_photo",
      status: "pending",
      expires_at: expiresAt,
    })
    .select("id, token, expires_at")
    .single();

  if (error || !session) {
    return NextResponse.json({ error: error?.message ?? "failed to create session" }, { status: 500 });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const mobileUrl = `${origin}/mobile-upload/${session.token}`;

  return NextResponse.json(
    { sessionId: session.id, token: session.token, mobileUrl, expiresAt: session.expires_at },
    { status: 201 },
  );
}
