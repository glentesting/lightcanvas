import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { projectFromRow } from "@/types/domain";
import { exportLightCanvasJson } from "@/lib/exports/lightcanvas-json";
import { exportXlights } from "@/lib/exports/xlights";

/** Sanitize a project name for use in a Content-Disposition filename. */
function sanitizeFilename(name: string): string {
  // Strip newlines, quotes, path separators and control characters; truncate to 100 chars
  const sanitized = name
    .replace(/[\r\n"/\\:]/g, "_")
    .replace(/[\x00-\x1f\x7f]/g, "_")
    .trim()
    .substring(0, 100);
  return sanitized || "project";
}

/** Build a RFC 6266-compliant Content-Disposition with ASCII fallback + UTF-8 encoded name. */
function contentDisposition(rawName: string, extension: string): string {
  const safe = sanitizeFilename(rawName);
  const asciiOnly = safe.replace(/[^\x20-\x7e]/g, "_");
  const encoded = encodeURIComponent(`${safe}.${extension}`);
  return `attachment; filename="${asciiOnly}.${extension}"; filename*=UTF-8''${encoded}`;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { projectId, format } = body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  if (!format || !["lightcanvas-json", "xlights"].includes(format)) {
    return NextResponse.json(
      { error: "format must be 'lightcanvas-json' or 'xlights'" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: row, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const project = projectFromRow(row);

  if (format === "lightcanvas-json") {
    const blob = exportLightCanvasJson(project);
    const buffer = Buffer.from(await blob.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": contentDisposition(`${project.name || "project"}.lightcanvas`, "json"),
      },
    });
  }

  if (format === "xlights") {
    const nameMap: Record<string, string> = body.nameMap || {};
    const frameTimeMs = [20, 25, 40, 50].includes(body.frameTimeMs) ? body.frameTimeMs : 50;
    const blob = exportXlights(project, nameMap, { frameTimeMs });
    const buffer = Buffer.from(await blob.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": contentDisposition(project.name || "project", "xsq"),
      },
    });
  }

  return NextResponse.json({ error: "Unknown format" }, { status: 400 });
}
