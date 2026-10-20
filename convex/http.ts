import { httpRouter } from "convex/server";
import { tokensMatch } from "./model/auth";
import type { FleetSnapshot } from "./model/types";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

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
    if (!tokensMatch(presentedToken(request), process.env.TASKMAN_INGEST_TOKEN)) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
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
        snapshot: body.snapshot as FleetSnapshot,
        replace: body.replace !== false,
      });
      return Response.json(result);
    } catch {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
  }),
});

export default http;
