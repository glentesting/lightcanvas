import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { projectFromRow } from "@/types/domain";
import { exportLightCanvasJson } from "@/lib/exports/lightcanvas-json";
import { exportXlights } from "@/lib/exports/xlights";
import { projectExportSchema } from "@/lib/schemas/projects";

export const POST = withAuth(async (request, { userId, supabase }) => {
  const body = await request.json();
  const parsed = projectExportSchema.safeParse(body);
  if (!parsed.success) {
    // Match original error messages for caller compatibility
    if (!body?.projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "format must be 'lightcanvas-json' or 'xlights'" },
      { status: 400 },
    );
  }
  const { projectId, format } = parsed.data;

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
    const nameMap = parsed.data.nameMap ?? {};
    const frameTimeMs = parsed.data.frameTimeMs ?? 50;
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
});
