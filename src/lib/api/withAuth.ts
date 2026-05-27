import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase";

/**
 * Context passed to wrapped route handlers.
 *
 * - `userId`: Clerk user ID (always present; the wrapper returns 401 otherwise).
 * - `supabase`: server-side Supabase client (service role).
 * - `params`: resolved dynamic route params (or `{}` for non-dynamic routes).
 */
export type AuthedContext<P = Record<string, never>> = {
  userId: string;
  supabase: SupabaseClient;
  params: P;
};

/**
 * Next.js 16 route handlers receive `{ params: Promise<...> }` for dynamic routes
 * and no second argument for non-dynamic routes. We accept both shapes and
 * normalize them for the inner handler.
 */
type RouteHandlerContext<P> = { params: Promise<P> };

type WrappedHandler<P> = (
  request: Request,
  ctx?: RouteHandlerContext<P>,
) => Promise<Response>;

/**
 * Wraps a route handler with Clerk auth + Supabase service client.
 *
 * Inner handler receives `(request, { userId, supabase, params })`.
 * Returns 401 if no userId is present.
 *
 * The returned function preserves the standard Next.js 16 route handler
 * signature: `(request, { params })` for dynamic routes, or `(request)` for
 * static ones (the second arg is simply ignored when absent).
 */
export function withAuth<P = Record<string, never>>(
  handler: (req: Request, ctx: AuthedContext<P>) => Promise<Response>,
): WrappedHandler<P> {
  return async (request, routeCtx) => {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = routeCtx ? await routeCtx.params : ({} as P);
    return handler(request, {
      userId,
      supabase: createServiceClient(),
      params,
    });
  };
}
