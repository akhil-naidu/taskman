import { httpRouter } from "convex/server";
import { auth } from "./auth";
import {
  bearerToken,
  blankState,
  handleMcpMessage,
  mcpHttpBody,
  methodOf,
  needsToken,
  originAllowed,
  protocolVersionAllowed,
} from "./model/mcp";
import { sha256Hex } from "./model/secrets";
import type { FleetSnapshot, FleetState } from "./model/types";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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
  path: "/mcp",
  method: "GET",
  handler: httpAction(async () => new Response(null, { status: 405, headers: { Allow: "POST" } })),
});

http.route({
  path: "/mcp",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!originAllowed(request.headers.get("origin"), process.env.SITE_URL)) {
      return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "origin rejected" } }, { status: 403 });
    }
    if (!protocolVersionAllowed(request.headers.get("mcp-protocol-version"))) {
      return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "unsupported protocol version" } }, { status: 400 });
    }
    let message: unknown;
    try {
      message = await request.json();
    } catch {
      message = null;
    }
    const method = methodOf(message);
    let token: { canWrite: boolean } | null = null;
    let state: FleetState = blankState();
    let workspaceId: Id<"workspaces"> | null = null;
    if (needsToken(method)) {
      const raw = bearerToken(request.headers.get("authorization"));
      const tokenHash = raw ? await sha256Hex(raw) : "";
      const match = tokenHash ? await ctx.runQuery(internal.ingestTokens.lookup, { tokenHash }) : null;
      if (!match) {
        const outcome = handleMcpMessage(message, null, state);
        return mcpResponse(request, outcome);
      }
      token = { canWrite: match.canWrite };
      workspaceId = match.workspaceId;
      state = await ctx.runQuery(internal.mcp.load, { workspaceId: match.workspaceId });
    }
    const outcome = handleMcpMessage(message, token, state);
    if (outcome.nextState && workspaceId) {
      await ctx.runMutation(internal.mcp.save, { workspaceId, state: outcome.nextState });
    }
    return mcpResponse(request, outcome);
  }),
});

function mcpResponse(request: Request, outcome: ReturnType<typeof handleMcpMessage>) {
  const packed = mcpHttpBody(request.headers.get("accept") ?? "", outcome);
  if (packed.body === null) return new Response(null, { status: packed.status });
  return new Response(packed.body, {
    status: packed.status,
    headers: packed.contentType ? { "Content-Type": packed.contentType } : undefined,
  });
}

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
