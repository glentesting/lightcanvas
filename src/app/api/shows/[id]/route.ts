import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shows")
    .select("*")
    .eq("id", id)
    .eq("owner_id", userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Only allow updating specific fields
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.season_year !== undefined) updates.season_year = body.season_year;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.song_order !== undefined) updates.song_order = body.song_order;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shows")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceClient();

  // First, unlink all projects from this show
  await supabase
    .from("projects")
    .update({ parent_show_id: null })
    .eq("parent_show_id", id)
    .eq("owner_id", userId);

  // Then delete the show
  const { error } = await supabase
    .from("shows")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const { project_id } = body;

  if (body.action === "assign-project") {
    if (!project_id) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify the show belongs to the user
    const { data: show, error: showErr } = await supabase
      .from("shows")
      .select("id, song_order")
      .eq("id", id)
      .eq("owner_id", userId)
      .single();

    if (showErr || !show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    // Verify the project belongs to the user
    const { error: projErr } = await supabase
      .from("projects")
      .select("id")
      .eq("id", project_id)
      .eq("owner_id", userId)
      .single();

    if (projErr) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Assign project to show
    const { error: updateErr } = await supabase
      .from("projects")
      .update({ parent_show_id: id })
      .eq("id", project_id)
      .eq("owner_id", userId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Add project to song_order if not already there
    const songOrder = (show.song_order as string[]) || [];
    if (!songOrder.includes(project_id)) {
      await supabase
        .from("shows")
        .update({ song_order: [...songOrder, project_id] })
        .eq("id", id)
        .eq("owner_id", userId);
    }

    return NextResponse.json({ success: true });
  }

  if (body.action === "unassign-project") {
    if (!project_id) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify the show belongs to the user
    const { data: show, error: showErr } = await supabase
      .from("shows")
      .select("id, song_order")
      .eq("id", id)
      .eq("owner_id", userId)
      .single();

    if (showErr || !show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    // Unset parent_show_id on the project
    await supabase
      .from("projects")
      .update({ parent_show_id: null })
      .eq("id", project_id)
      .eq("owner_id", userId);

    // Remove from song_order
    const songOrder = (show.song_order as string[]) || [];
    const newOrder = songOrder.filter((sid: string) => sid !== project_id);
    await supabase
      .from("shows")
      .update({ song_order: newOrder })
      .eq("id", id)
      .eq("owner_id", userId);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
