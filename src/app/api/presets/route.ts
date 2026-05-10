import { NextResponse } from "next/server";
import { BUILTIN_PRESETS } from "@/lib/presets/builtins";

export async function GET() {
  return NextResponse.json(BUILTIN_PRESETS);
}
