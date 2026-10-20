import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { decryptString } from "./model/secrets";
import type { FleetState, WebhookEvent } from "./model/types";
import { applyDeliveryAttempt, postWebhook, type SealedWebhook } from "./model/webhooks";
import { loadState, writeState } from "./persist";

const sealedValidator = v.object({
  botKey: v.string(),
  ciphertext: v.string(),
  iv: v.string(),
  hint: v.string(),
});

const webhookEvent = v.union(v.literal("decision_recorded"), v.literal("task_approved"), v.literal("instruction_added"));

export async function upsertSealedWebhooks(ctx: MutationCtx, workspaceId: Id<"workspaces">, rows: SealedWebhook[]) {
  const now = Date.now();
  for (const row of rows) {
    const existing = await ctx.db
      .query("botWebhooks")
      .withIndex("by_workspace_bot", (q) => q.eq("workspaceId", workspaceId).eq("botKey", row.botKey))
      .unique();
    const patch = { ciphertext: row.ciphertext, iv: row.iv, hint: row.hint, updatedAt: now };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("botWebhooks", { workspaceId, botKey: row.botKey, ...patch });
  }
}

export async function scheduleNewDeliveries(
  ctx: { scheduler: MutationCtx["scheduler"] },
  workspaceId: Id<"workspaces">,
  keys: string[],
) {
  for (const deliveryKey of keys) {
    await ctx.scheduler.runAfter(0, internal.webhooks.deliver, { workspaceId, deliveryKey });
  }
}

export async function applyCommit(
  ctx: MutationCtx,
  args: { workspaceId: Id<"workspaces">; state: FleetState | null; sealed: SealedWebhook[]; deliveryKeys: string[] },
) {
  if (args.sealed.length > 0) await upsertSealedWebhooks(ctx, args.workspaceId, args.sealed);
  if (args.state) await writeState(ctx, args.workspaceId, args.state);
  await scheduleNewDeliveries(ctx, args.workspaceId, args.deliveryKeys);
}

export const commit = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    state: v.union(v.null(), v.any()),
    sealed: v.array(sealedValidator),
    deliveryKeys: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await applyCommit(ctx, {
      workspaceId: args.workspaceId,
      state: (args.state as FleetState | null) ?? null,
      sealed: args.sealed,
      deliveryKeys: args.deliveryKeys,
    });
    return null;
  },
});

export const loadDelivery = internalQuery({
  args: { workspaceId: v.id("workspaces"), deliveryKey: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      ciphertext: v.string(),
      iv: v.string(),
      event: webhookEvent,
      taskKey: v.string(),
      title: v.string(),
      decision: v.string(),
      boardUrl: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const { state } = await loadState(ctx, args.workspaceId);
    const delivery = (state.deliveries ?? []).find((item) => item.key === args.deliveryKey);
    if (!delivery || delivery.status !== "pending") return null;
    const sealed = await ctx.db
      .query("botWebhooks")
      .withIndex("by_workspace_bot", (q) => q.eq("workspaceId", args.workspaceId).eq("botKey", delivery.botKey))
      .unique();
    return {
      ciphertext: sealed?.ciphertext ?? "",
      iv: sealed?.iv ?? "",
      event: delivery.event,
      taskKey: delivery.taskKey,
      title: delivery.title,
      decision: delivery.decision,
      boardUrl: delivery.boardUrl,
    };
  },
});

export const recordAttempt = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    deliveryKey: v.string(),
    ok: v.boolean(),
    error: v.string(),
  },
  returns: v.object({ retryInMs: v.union(v.number(), v.null()) }),
  handler: async (ctx, args) => {
    const { state } = await loadState(ctx, args.workspaceId);
    const applied = applyDeliveryAttempt(state, args.deliveryKey, { ok: args.ok, error: args.error }, Date.now());
    if (applied.state !== state) await writeState(ctx, args.workspaceId, applied.state);
    return { retryInMs: applied.retryInMs };
  },
});

export const deliver = internalAction({
  args: { workspaceId: v.id("workspaces"), deliveryKey: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.webhooks.loadDelivery, args);
    if (!job) return null;
    const outcome = await deliverOnce(job);
    const recorded = await ctx.runMutation(internal.webhooks.recordAttempt, {
      workspaceId: args.workspaceId,
      deliveryKey: args.deliveryKey,
      ok: outcome.ok,
      error: outcome.error,
    });
    if (recorded.retryInMs !== null) await ctx.scheduler.runAfter(recorded.retryInMs, internal.webhooks.deliver, args);
    return null;
  },
});

async function deliverOnce(job: {
  ciphertext: string;
  iv: string;
  event: WebhookEvent;
  taskKey: string;
  title: string;
  decision: string;
  boardUrl: string;
}): Promise<{ ok: boolean; error: string }> {
  if (!job.ciphertext || !job.iv) return { ok: false, error: "No webhook" };
  const material = process.env.TASKMAN_ENCRYPTION_KEY;
  if (!material) return { ok: false, error: "Encryption key is not set" };
  try {
    const url = await decryptString(job.ciphertext, job.iv, material);
    return await postWebhook(
      url,
      { event: job.event, taskKey: job.taskKey, title: job.title, decision: job.decision, boardUrl: job.boardUrl },
      fetch,
    );
  } catch {
    return { ok: false, error: "Request failed" };
  }
}
