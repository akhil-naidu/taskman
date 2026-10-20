import { v } from "convex/values";
import { tokensMatch } from "./model/auth";
import { planSnapshot } from "./model/store";
import type { FleetSnapshot } from "./model/types";
import { loadState, writeState } from "./persist";
import { internalMutation, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { ingestResult, snapshotValidator } from "./validators";

async function apply(ctx: MutationCtx, snapshot: FleetSnapshot, replace: boolean) {
  const { state } = await loadState(ctx, true);
  const next = planSnapshot(state, snapshot, { now: Date.now(), replace });
  await writeState(ctx, next);
  return {
    bots: next.bots.length,
    routines: next.routines.length,
    runs: next.runs.length,
    tasks: next.tasks.length,
    syncLinks: next.syncLinks.length,
  };
}

export const applySnapshot = internalMutation({
  args: { snapshot: snapshotValidator, replace: v.boolean() },
  returns: ingestResult,
  handler: async (ctx, args) => apply(ctx, args.snapshot, args.replace),
});

export const ingestFleet = mutation({
  args: { token: v.string(), snapshot: snapshotValidator, replace: v.optional(v.boolean()) },
  returns: ingestResult,
  handler: async (ctx, args) => {
    if (!tokensMatch(args.token, process.env.TASKMAN_INGEST_TOKEN)) throw new Error("Unauthorized");
    return apply(ctx, args.snapshot, args.replace !== false);
  },
});
