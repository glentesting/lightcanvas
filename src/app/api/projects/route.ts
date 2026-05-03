import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

const DEFAULT_FIXTURES = [
  { id: crypto.randomUUID(), kind: "roofline", name: "Roofline strip", pixelCount: 220, startChannel: 1 },
  { id: crypto.randomUUID(), kind: "mega-tree", name: "Mega tree", pixelCount: 480, startChannel: 661 },
  { id: crypto.randomUUID(), kind: "mini-tree", name: "Mini tree", pixelCount: 50, startChannel: 2101 },
  { id: crypto.randomUUID(), kind: "arch", name: "Arch", pixelCount: 50, startChannel: 2251 },
  { id: crypto.randomUUID(), kind: "bush", name: "Bush wrap", pixelCount: 60, startChannel: 2401 },
  { id: crypto.randomUUID(), kind: "window-outline", name: "Window outline", pixelCount: 32, startChannel: 2581 },
];

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, owner_id, audio_file, fixtures, created_at, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const fixtures = DEFAULT_FIXTURES.map((f) => ({ ...f, id: crypto.randomUUID() }));
  const tracks = fixtures.map((f) => ({ id: f.id, kind: "fixture" as const }));

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: userId,
      name,
      fixtures,
      sequence: { tracks, blocks: [], bpm: 120, beatGridOffset: 0 },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
