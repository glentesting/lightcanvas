import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Multi-step DB operations extracted from route handlers.
 *
 * Each helper does its own ownership check (`owner_id = userId`) — callers
 * should NOT assume prior ownership verification. Errors are thrown with
 * structured info so routes can map to status codes.
 */

export class OperationError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "OperationError";
  }
}

/**
 * Delete a project, cleaning up its audio file in storage first.
 *
 * The audio_url may be either a `bucket/path` string or a full Supabase URL
 * (handled for backwards compatibility). Best-effort: storage delete errors
 * are ignored so the row delete still proceeds.
 */
export async function deleteProjectWithCleanup(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<{ ok: true }> {
  // Fetch the project first to get audio info
  const { data: project } = await supabase
    .from("projects")
    .select("audio_url")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .single();

  if (!project) {
    throw new OperationError("Not found", 404);
  }

  // Delete audio file from storage if it exists
  if (project.audio_url) {
    const urlPath = String(project.audio_url).split("/storage/v1/object/")[1];
    if (urlPath) {
      // urlPath is like "sign/bucket/path" or "public/bucket/path"
      const parts = urlPath.split("/");
      const bucket = parts[1];
      const filePath = parts.slice(2).join("/");
      if (bucket && filePath) {
        await supabase.storage.from(bucket).remove([filePath]);
      }
    } else {
      // Stored as "bucket/path" directly
      const audioUrl = String(project.audio_url);
      const slashIndex = audioUrl.indexOf("/");
      if (slashIndex > 0) {
        const bucket = audioUrl.substring(0, slashIndex);
        const filePath = audioUrl.substring(slashIndex + 1);
        if (bucket && filePath) {
          await supabase.storage.from(bucket).remove([filePath]);
        }
      }
    }
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("owner_id", userId);

  if (error) {
    throw new OperationError(error.message, 500);
  }

  return { ok: true };
}

/**
 * Assign a project to a show:
 *   1) verify show ownership,
 *   2) verify project ownership,
 *   3) set `projects.parent_show_id`,
 *   4) append project to `shows.song_order` if not already present.
 */
export async function assignProjectToShow(
  supabase: SupabaseClient,
  showId: string,
  projectId: string,
  userId: string,
): Promise<{ success: true }> {
  // Verify the show belongs to the user
  const { data: show, error: showErr } = await supabase
    .from("shows")
    .select("id, song_order")
    .eq("id", showId)
    .eq("owner_id", userId)
    .single();

  if (showErr || !show) {
    throw new OperationError("Show not found", 404);
  }

  // Verify the project belongs to the user
  const { error: projErr } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .single();

  if (projErr) {
    throw new OperationError("Project not found", 404);
  }

  // Assign project to show
  const { error: updateErr } = await supabase
    .from("projects")
    .update({ parent_show_id: showId })
    .eq("id", projectId)
    .eq("owner_id", userId);

  if (updateErr) {
    throw new OperationError(updateErr.message, 500);
  }

  // Add project to song_order if not already there
  const songOrder = (show.song_order as string[]) || [];
  if (!songOrder.includes(projectId)) {
    await supabase
      .from("shows")
      .update({ song_order: [...songOrder, projectId] })
      .eq("id", showId)
      .eq("owner_id", userId);
  }

  return { success: true };
}

/**
 * Unassign a project from a show: clear `parent_show_id` and remove from
 * `song_order`. Used by the same `[id]/route.ts` POST endpoint.
 */
export async function unassignProjectFromShow(
  supabase: SupabaseClient,
  showId: string,
  projectId: string,
  userId: string,
): Promise<{ success: true }> {
  // Verify the show belongs to the user
  const { data: show, error: showErr } = await supabase
    .from("shows")
    .select("id, song_order")
    .eq("id", showId)
    .eq("owner_id", userId)
    .single();

  if (showErr || !show) {
    throw new OperationError("Show not found", 404);
  }

  // Unset parent_show_id on the project
  await supabase
    .from("projects")
    .update({ parent_show_id: null })
    .eq("id", projectId)
    .eq("owner_id", userId);

  // Remove from song_order
  const songOrder = (show.song_order as string[]) || [];
  const newOrder = songOrder.filter((sid: string) => sid !== projectId);
  await supabase
    .from("shows")
    .update({ song_order: newOrder })
    .eq("id", showId)
    .eq("owner_id", userId);

  return { success: true };
}

/**
 * Result of resolving a signed audio URL.
 *
 * - `signedUrl` is set when Supabase returned one (preferred).
 * - `publicUrl` is set as a fallback when signing failed but the bucket is
 *   public (`songs` historically is). Callers should redirect to whichever
 *   is present.
 */
export type AudioUrlResult =
  | { signedUrl: string; publicUrl?: undefined }
  | { signedUrl?: undefined; publicUrl: string };

/**
 * Resolve a playable audio URL for a project, verifying ownership.
 *
 * Parses the project's `audio_url` (which may be either a `bucket/path`
 * string or a full Supabase URL), tries to mint a 1-hour signed URL, and
 * falls back to the public URL when signing fails.
 */
export async function getSignedAudioUrl(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<AudioUrlResult> {
  const { data: project } = await supabase
    .from("projects")
    .select("audio_url")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .single();

  if (!project || !project.audio_url) {
    throw new OperationError("Not found", 404);
  }

  const audioUrl = project.audio_url as string;

  // Parse bucket and path
  let bucket: string;
  let filePath: string;

  if (audioUrl.startsWith("http")) {
    const match = audioUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) {
      throw new OperationError("Cannot parse audio URL", 500);
    }
    bucket = match[1];
    filePath = match[2];
  } else {
    const slashIndex = audioUrl.indexOf("/");
    bucket = audioUrl.substring(0, slashIndex);
    filePath = audioUrl.substring(slashIndex + 1);
  }

  // Generate signed URL (songs bucket is public, but signed is cleaner)
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600);

  if (error || !data?.signedUrl) {
    // Fallback to public URL for the songs bucket
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
    return { publicUrl };
  }

  return { signedUrl: data.signedUrl };
}
