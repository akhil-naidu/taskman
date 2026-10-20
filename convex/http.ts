import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { sha256Hex } from "./model/secrets";
import type { FleetSnapshot } from "./model/types";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();
auth.addHttpRoutes(http);

function presentedToken(request: Request): string {
  const header = request.headers.get("x-taskman-token");
  if (header) return header;
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

http.route({
  path: "/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const token = presentedToken(request);
    const tokenHash = token ? await sha256Hex(token) : "";
    const match = tokenHash ? await ctx.runQuery(internal.ingestTokens.lookup, { tokenHash }) : null;
    if (!match) return Response.json({ error: "unauthorized" }, { status: 401 });
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }
    if (!payload || typeof payload !== "object") {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
    const body = payload as { snapshot?: FleetSnapshot; replace?: boolean };
    try {
      const result = await ctx.runMutation(internal.ingest.applySnapshot, {
        workspaceId: match.workspaceId,
        snapshot: body.snapshot as FleetSnapshot,
        replace: body.replace !== false,
      });
      return Response.json(result);
    } catch {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
  }),
});

http.route({
  path: "/oauth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code") ?? "";
    const state = url.searchParams.get("state") ?? "";
    const site = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    if (!code || !state) return Response.redirect(`${site}/settings?oauth=missing`, 302);
    try {
      const result = await ctx.runAction(internal.credentials.completeOauth, { code, state });
      return Response.redirect(`${site}/settings?connected=${encodeURIComponent(result.provider)}`, 302);
    } catch {
      return Response.redirect(`${site}/settings?oauth=failed`, 302);
    }
  }),
});

export default http;
