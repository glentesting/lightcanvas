import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

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

  // The plaintext token is returned to the desktop caller exactly once,
  // embedded in the QR-code URL. Only the SHA-256 hash is persisted — so even
  // if the upload_sessions row is read by an anon Supabase client (which it
  // can be, because the realtime subscriber on the desktop uses the anon
  // key), the bearer token cannot be recovered.
  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const { data: session, error } = await supabase
    .from("upload_sessions")
    .insert({
      token_hash: tokenHash,
      owner_id: userId,
      project_id: projectId,
      kind: "house_photo",
      status: "pending",
      expires_at: expiresAt,
    })
    .select("id, expires_at")
    .single();

  if (error || !session) {
    return NextResponse.json({ error: error?.message ?? "failed to create session" }, { status: 500 });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const mobileUrl = `${origin}/mobile-upload/${token}`;

  return NextResponse.json(
    { sessionId: session.id, token, mobileUrl, expiresAt: session.expires_at },
    { status: 201 },
  );
}
