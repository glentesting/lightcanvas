import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// /dev/* is public but the pages themselves 404 in production builds.
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/p/(.*)", "/dev/(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

// Note: Onboarding redirect is handled client-side in dashboard/page.tsx
// by checking user.publicMetadata.onboardingComplete via useUser().

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
