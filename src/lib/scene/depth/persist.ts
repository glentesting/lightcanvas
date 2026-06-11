import type { DepthMap } from "../types";
import { depthToPng, estimateDepth, pngToDepth, type DepthProgress } from "./estimate";

/**
 * Depth maps are persisted by path convention: `depth.png` in the same storage
 * folder as the house photo (`{userId}/{projectId}/house.ext`). No schema
 * change needed — the URL is derived from the photo URL. Uploading a new house
 * photo deletes the stale depth.png (see upload-house-photo route).
 */

export type DepthStatus =
  | { phase: "checking" }
  | { phase: "loading-model"; pct: number }
  | { phase: "estimating" }
  | { phase: "ready" }
  | { phase: "failed" };

export function depthUrlForPhoto(photoUrl: string): string | null {
  try {
    const url = new URL(photoUrl);
    const segments = url.pathname.split("/");
    segments[segments.length - 1] = "depth.png";
    url.pathname = segments.join("/");
    url.search = "";
    return url.toString();
  } catch {
    return null; // blob:/data: URLs (dev harness) — nothing to fetch
  }
}

async function fetchPersistedDepth(photoUrl: string): Promise<DepthMap | null> {
  const depthUrl = depthUrlForPhoto(photoUrl);
  if (!depthUrl) return null;
  try {
    // HEAD-check first so a missing map doesn't decode an error page.
    const head = await fetch(`${depthUrl}?v=${Date.now()}`, { method: "HEAD", cache: "no-store" });
    if (!head.ok) return null;
    return await pngToDepth(`${depthUrl}?v=${Date.now()}`);
  } catch {
    return null;
  }
}

async function uploadDepth(projectId: string, depth: DepthMap): Promise<void> {
  const png = await depthToPng(depth);
  const form = new FormData();
  form.append("file", png, "depth.png");
  form.append("projectId", projectId);
  await fetch("/api/upload-depth-map", { method: "POST", body: form });
}

/**
 * Get the depth map for a house photo: persisted copy if it exists, otherwise
 * estimate client-side and persist for next time. Returns null on failure —
 * callers fall back to a flat (no-parallax) stage.
 */
export async function loadOrCreateDepth(
  photoUrl: string,
  projectId: string | null,
  onStatus?: (s: DepthStatus) => void
): Promise<DepthMap | null> {
  try {
    onStatus?.({ phase: "checking" });
    if (projectId) {
      const persisted = await fetchPersistedDepth(photoUrl);
      if (persisted) {
        onStatus?.({ phase: "ready" });
        return persisted;
      }
    }

    const depth = await estimateDepth(photoUrl, (p: DepthProgress) => {
      if (p.stage === "loading-model") onStatus?.({ phase: "loading-model", pct: p.pct });
      else onStatus?.({ phase: "estimating" });
    });

    if (projectId) {
      // Fire-and-forget — persistence failing must not block the stage.
      uploadDepth(projectId, depth).catch(() => {});
    }
    onStatus?.({ phase: "ready" });
    return depth;
  } catch (e) {
    console.warn("Depth estimation failed, rendering flat stage:", e);
    onStatus?.({ phase: "failed" });
    return null;
  }
}
