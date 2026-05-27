import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getSignedAudioUrl, OperationError } from "@/lib/db/operations";

type Params = { projectId: string };

export const GET = withAuth<Params>(async (_req, { userId, supabase, params }) => {
  try {
    const result = await getSignedAudioUrl(supabase, params.projectId, userId);
    return NextResponse.redirect(result.signedUrl ?? result.publicUrl);
  } catch (e) {
    if (e instanceof OperationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
});
