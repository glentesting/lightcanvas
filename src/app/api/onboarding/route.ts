import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { onboardingPatchSchema, onboardingSubmitSchema } from "@/lib/schemas/ai";

export const POST = withAuth(async (request, { userId }) => {
  const body = await request.json();
  const parsed = onboardingSubmitSchema.safeParse(body);
  // Behavior preserved: fall back to defaults for invalid/missing fields rather than 400
  const decorating = parsed.success ? parsed.data.decorating ?? "house" : "house";
  const lightCount = parsed.success ? parsed.data.lightCount ?? 500 : 500;
  const sequencer = parsed.success ? parsed.data.sequencer ?? "xlights" : "xlights";

  const client = await clerkClient();
  await client.users.updateUser(userId, {
    publicMetadata: {
      onboardingComplete: true,
      decorating,
      lightCount,
      sequencer,
    },
  });

  return NextResponse.json({ success: true });
});

export const PATCH = withAuth(async (request, { userId }) => {
  const body = await request.json();
  const parsed = onboardingPatchSchema.safeParse(body);

  // Preserve original messages: explicit invalid value -> 400 with field-specific error
  if (!parsed.success) {
    if (body?.sequencer !== undefined) {
      return NextResponse.json({ error: "Invalid sequencer" }, { status: 400 });
    }
    if (body?.controllerType !== undefined) {
      return NextResponse.json({ error: "Invalid controller type" }, { status: 400 });
    }
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (parsed.data.sequencer) updates.sequencer = parsed.data.sequencer;
  if (parsed.data.controllerType) updates.controllerType = parsed.data.controllerType;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  await client.users.updateUser(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      ...updates,
    },
  });

  return NextResponse.json({ success: true });
});
