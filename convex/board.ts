import { v } from "convex/values";
import { requireMember } from "./guard";
import { answerDecision, approveTask, queueInstruction } from "./model/decisions";
import { loadState, writeState } from "./persist";
import { mutation } from "./_generated/server";

export const approve = mutation({
  args: { workspaceId: v.id("workspaces"), key: v.string() },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const { state } = await loadState(ctx, args.workspaceId);
    const result = approveTask(state, args.key, Date.now());
    if (result.error) throw new Error(result.error);
    await writeState(ctx, args.workspaceId, result.state);
    return null;
  },
});

export const answer = mutation({
  args: { workspaceId: v.id("workspaces"), key: v.string(), answer: v.string() },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const { state } = await loadState(ctx, args.workspaceId);
    const result = answerDecision(state, args.key, args.answer, Date.now());
    if (result.error) throw new Error(result.error);
    await writeState(ctx, args.workspaceId, result.state);
    return null;
  },
});

export const queue = mutation({
  args: { workspaceId: v.id("workspaces"), body: v.string(), botKey: v.optional(v.string()), taskKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const { state } = await loadState(ctx, args.workspaceId);
    const result = queueInstruction(state, { body: args.body, botKey: args.botKey, taskKey: args.taskKey }, Date.now());
    if (result.error) throw new Error(result.error);
    await writeState(ctx, args.workspaceId, result.state);
    return null;
  },
});
