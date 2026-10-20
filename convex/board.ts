import { v } from "convex/values";
import { requireMember } from "./guard";
import { answerDecision, approveTask, queueInstruction } from "./model/decisions";
import { boardUrlFromSite, newPendingKeys, wakeForApproval, wakeForDecision, wakeForInstruction } from "./model/webhooks";
import type { FleetState } from "./model/types";
import { loadState, writeState } from "./persist";
import { mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { scheduleNewDeliveries } from "./webhooks";

export const approve = mutation({
  args: { workspaceId: v.id("workspaces"), key: v.string() },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const now = Date.now();
    const { state } = await loadState(ctx, args.workspaceId);
    const result = approveTask(state, args.key, now);
    if (result.error) throw new Error(result.error);
    const woken = wakeForApproval(state, result.state, boardUrlFromSite(process.env.SITE_URL), now);
    await commitBoard(ctx, args.workspaceId, state, woken);
    return null;
  },
});

export const answer = mutation({
  args: { workspaceId: v.id("workspaces"), key: v.string(), answer: v.string() },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const now = Date.now();
    const { state } = await loadState(ctx, args.workspaceId);
    const result = answerDecision(state, args.key, args.answer, now);
    if (result.error) throw new Error(result.error);
    const woken = wakeForDecision(state, result.state, boardUrlFromSite(process.env.SITE_URL), now);
    await commitBoard(ctx, args.workspaceId, state, woken);
    return null;
  },
});

export const queue = mutation({
  args: { workspaceId: v.id("workspaces"), body: v.string(), botKey: v.optional(v.string()), taskKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const now = Date.now();
    const { state } = await loadState(ctx, args.workspaceId);
    const result = queueInstruction(state, { body: args.body, botKey: args.botKey, taskKey: args.taskKey }, now);
    if (result.error) throw new Error(result.error);
    const woken = wakeForInstruction(state, result.state, boardUrlFromSite(process.env.SITE_URL), now);
    await commitBoard(ctx, args.workspaceId, state, woken);
    return null;
  },
});

async function commitBoard(ctx: MutationCtx, workspaceId: Id<"workspaces">, before: FleetState, after: FleetState) {
  await writeState(ctx, workspaceId, after);
  await scheduleNewDeliveries(ctx, workspaceId, newPendingKeys(before, after));
}
