import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { projectFromRow } from "@/types/domain";
import { exportLightCanvasJson } from "@/lib/exports/lightcanvas-json";
import { exportXlights } from "@/lib/exports/xlights";

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
        "Content-Disposition": `attachment; filename="${project.name || "project"}.lightcanvas.json"`,
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
        "Content-Disposition": `attachment; filename="${project.name || "project"}.xsq"`,
      },
    });
  }

  return NextResponse.json({ error: "Unknown format" }, { status: 400 });
}
