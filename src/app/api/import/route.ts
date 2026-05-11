import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, fixtures, sequence, audio } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    return NextResponse.json({ error: "At least one fixture is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: userId,
      name: name || "Imported Project",
      fixtures,
      sequence: sequence || { tracks: [], blocks: [], bpm: 120, beatGridOffset: 0 },
      audio: audio || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
