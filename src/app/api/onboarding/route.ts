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

  const client = await clerkClient();
  await client.users.updateUser(userId, {
    publicMetadata: {
      onboardingComplete: true,
      decorating,
      lightCount,
    },
  });

  return NextResponse.json({ success: true });
}
