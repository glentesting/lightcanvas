import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import {
  deleteProjectWithCleanup,
  OperationError,
} from "@/lib/db/operations";
import {
  projectActionSchema,
  projectPatchSchema,
} from "@/lib/schemas/projects";

type Params = { id: string };

export const GET = withAuth<Params>(async (_req, { userId, supabase, params }) => {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .eq("owner_id", userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
});

export const PATCH = withAuth<Params>(async (request, { userId, supabase, params }) => {
  const body = await request.json();
  const parsed = projectPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("projects")
    .update({ name: parsed.data.name })
    .eq("id", params.id)
    .eq("owner_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
});

export const DELETE = withAuth<Params>(async (_req, { userId, supabase, params }) => {
  try {
    await deleteProjectWithCleanup(supabase, params.id, userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof OperationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
});

export const POST = withAuth<Params>(async (request, { userId, supabase, params }) => {
  const body = await request.json();
  const parsed = projectActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Fetch the original project
  const { data: original, error: fetchErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.id)
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

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  return NextResponse.json(copy, { status: 201 });
});
