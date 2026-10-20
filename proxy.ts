import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";

const isSignIn = createRouteMatcher(["/signin"]);

const handle = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isSignIn(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/");
  }
  if (!isSignIn(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return;
  return handle(request, event);
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
