import { v } from "convex/values";
import { sha256Hex } from "./model/secrets";
import { planSnapshot } from "./model/store";
import type { FleetSnapshot } from "./model/types";
import { loadState, writeState } from "./persist";
import { internalMutation, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ingestResult, snapshotValidator } from "./validators";

async function apply(ctx: MutationCtx, workspaceId: Id<"workspaces">, snapshot: FleetSnapshot, replace: boolean) {
  const { state } = await loadState(ctx, workspaceId, true);
  const next = planSnapshot(state, snapshot, { now: Date.now(), replace });
  await writeState(ctx, workspaceId, next);
  return {
    bots: next.bots.length,
    routines: next.routines.length,
    runs: next.runs.length,
    tasks: next.tasks.length,
    syncLinks: next.syncLinks.length,
  };
}

export const applySnapshot = internalMutation({
  args: { workspaceId: v.id("workspaces"), snapshot: snapshotValidator, replace: v.boolean() },
  returns: ingestResult,
  handler: async (ctx, args) => apply(ctx, args.workspaceId, args.snapshot, args.replace),
});

export const ingestFleet = mutation({
  args: { token: v.string(), snapshot: snapshotValidator, replace: v.optional(v.boolean()) },
  returns: ingestResult,
  handler: async (ctx, args) => {
    const tokenHash = await sha256Hex(args.token);
    const match = await ctx.db
      .query("ingestTokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (!match || match.revokedAt) throw new Error("Unauthorized");
    return apply(ctx, match.workspaceId, args.snapshot, args.replace !== false);
  },
});
