import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const validDecorating = ["house", "yard", "both"];
  const decorating = validDecorating.includes(body.decorating) ? body.decorating : "house";
  const lightCount = typeof body.lightCount === "number" && body.lightCount >= 100 && body.lightCount <= 10000
    ? body.lightCount : 500;
  const validSequencers = ["xlights", "lor", "vixen", "other"];
  const sequencer = validSequencers.includes(body.sequencer) ? body.sequencer : "xlights";

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
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const validSequencers = ["xlights", "lor", "vixen", "other"];
  const validControllers = ["falcon-f16v3", "alphapix-16", "wled-esp32", "lor-controller", "other"];

  const updates: Record<string, string> = {};

  if (body.sequencer) {
    const sequencer = validSequencers.includes(body.sequencer) ? body.sequencer : undefined;
    if (!sequencer) {
      return NextResponse.json({ error: "Invalid sequencer" }, { status: 400 });
    }
    updates.sequencer = sequencer;
  }

  if (body.controllerType) {
    const controllerType = validControllers.includes(body.controllerType) ? body.controllerType : undefined;
    if (!controllerType) {
      return NextResponse.json({ error: "Invalid controller type" }, { status: 400 });
    }
    updates.controllerType = controllerType;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  // Best-effort: read-then-write race is acceptable here — this is a one-shot settings flow.
  await client.users.updateUser(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      ...updates,
    },
  });

  return NextResponse.json({ success: true });
}
