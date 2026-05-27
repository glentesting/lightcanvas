import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import {
  assignProjectToShow,
  OperationError,
  unassignProjectFromShow,
} from "@/lib/db/operations";
import { showActionSchema, showPatchSchema } from "@/lib/schemas/shows";

type Params = { id: string };

export const GET = withAuth<Params>(async (_req, { userId, supabase, params }) => {
  const { data, error } = await supabase
    .from("shows")
    .select("*")
    .eq("id", params.id)
    .eq("owner_id", userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
});

export const PATCH = withAuth<Params>(async (request, { userId, supabase, params }) => {
  const body = await request.json();
  const parsed = showPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("shows")
    .update(parsed.data)
    .eq("id", params.id)
    .eq("owner_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
});

export const DELETE = withAuth<Params>(async (_req, { userId, supabase, params }) => {
  // First, unlink all projects from this show
  await supabase
    .from("projects")
    .update({ parent_show_id: null })
    .eq("parent_show_id", params.id)
    .eq("owner_id", userId);

  // Then delete the show
  const { error } = await supabase
    .from("shows")
    .delete()
    .eq("id", params.id)
    .eq("owner_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
});

export const POST = withAuth<Params>(async (request, { userId, supabase, params }) => {
  const body = await request.json();
  const parsed = showActionSchema.safeParse(body);
  if (!parsed.success) {
    // Preserve original behavior: distinguish missing project_id vs invalid action
    if (
      body &&
      typeof body === "object" &&
      (body.action === "assign-project" || body.action === "unassign-project") &&
      !body.project_id
    ) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    if (parsed.data.action === "assign-project") {
      await assignProjectToShow(supabase, params.id, parsed.data.project_id, userId);
    } else {
      await unassignProjectFromShow(supabase, params.id, parsed.data.project_id, userId);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof OperationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
});
