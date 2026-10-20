import { v } from "convex/values";
import { blankState, handleMcpMessage, methodOf, needsToken } from "./model/mcp";
import type { FleetState } from "./model/types";
import { loadState, writeState } from "./persist";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation } from "./_generated/server";

export const load = internalQuery({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args): Promise<FleetState> => {
    const { state } = await loadState(ctx, args.workspaceId);
    return state;
  },
});

export const save = internalMutation({
  args: { workspaceId: v.id("workspaces"), state: v.any() },
  handler: async (ctx, args): Promise<null> => {
    await writeState(ctx, args.workspaceId, args.state as FleetState);
    return null;
  },
});

export const dispatch = mutation({
  args: { tokenHash: v.string(), message: v.any() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const access = await ctx.db
      .query("oauthTokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();
    let token: { canWrite: boolean } | null = null;
    let workspaceId: Id<"workspaces"> | null = null;
    if (access && access.kind === "access" && !access.revokedAt && access.expiresAt > now) {
      token = { canWrite: access.scopes.includes("board:write") };
      workspaceId = access.workspaceId;
    } else if (!access) {
      const ingest = await ctx.db
        .query("ingestTokens")
        .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
        .unique();
      if (ingest && !ingest.revokedAt) {
        token = { canWrite: ingest.canWrite === true };
        workspaceId = ingest.workspaceId;
      }
    }
    const method = methodOf(args.message);
    if (!needsToken(method)) {
      const outcome = handleMcpMessage(args.message, null, blankState(), now);
      return { httpStatus: outcome.httpStatus, body: outcome.body };
    }
    if (!token || !workspaceId) {
      const outcome = handleMcpMessage(args.message, null, blankState(), now);
      return { httpStatus: outcome.httpStatus, body: outcome.body };
    }
    const { state } = await loadState(ctx, workspaceId);
    const outcome = handleMcpMessage(args.message, token, state, now);
    if (outcome.nextState) await writeState(ctx, workspaceId, outcome.nextState);
    return { httpStatus: outcome.httpStatus, body: outcome.body };
  },
});
