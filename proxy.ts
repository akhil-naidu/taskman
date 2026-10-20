import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";

const isSignIn = createRouteMatcher(["/signin"]);

function isPublicMcp(request: NextRequest) {
  const path = request.nextUrl.pathname;
  return (
    path === "/api/mcp" ||
    path === "/api/oauth/register" ||
    path === "/api/oauth/token" ||
    path === "/.well-known/oauth-authorization-server" ||
    path === "/.well-known/oauth-protected-resource" ||
    path.startsWith("/.well-known/oauth-protected-resource/")
  );
}

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/signin")) return "/";
  return value;
}

const handle = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isSignIn(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, safeNext(request.nextUrl.searchParams.get("next")));
  }
  if (!isSignIn(request) && !(await convexAuth.isAuthenticated())) {
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return nextjsMiddlewareRedirect(request, `/signin?next=${encodeURIComponent(next)}`);
  }
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return;
  if (isPublicMcp(request)) return;
  return handle(request, event);
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
