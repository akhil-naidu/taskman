import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireOwner, requireUser } from "./guard";
import { resetNameMatches, WIPE_ON_RESET, type WipeTable } from "./model/reset";
import { mutation, query, type MutationCtx } from "./_generated/server";

function slugify(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "workspace";
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx).catch(() => null);
    if (!userId) return [];
    const memberships = await ctx.db.query("members").withIndex("by_user", (q) => q.eq("userId", userId)).take(50);
    const rows = [];
    for (const membership of memberships) {
      const workspace = await ctx.db.get(membership.workspaceId);
      if (!workspace) continue;
      rows.push({ id: workspace._id, name: workspace.name, slug: workspace.slug, role: membership.role });
    }
    return rows;
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const name = args.name.trim().slice(0, 80);
    if (!name) throw new Error("Name is required");
    let slug = slugify(name);
    const taken = await ctx.db.query("workspaces").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
    if (taken) slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
    const workspaceId = await ctx.db.insert("workspaces", { name, slug, createdAt: Date.now() });
    await ctx.db.insert("members", { workspaceId, userId, role: "owner" });
    return workspaceId;
  },
});

export const reset = mutation({
  args: { workspaceId: v.id("workspaces"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.workspaceId);
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || !resetNameMatches(workspace.name, args.name)) throw new Error("Workspace name does not match");
    for (const table of WIPE_ON_RESET) await deleteWorkspaceTable(ctx, args.workspaceId, table);
    return null;
  },
});

async function deleteWorkspaceTable(ctx: MutationCtx, workspaceId: Id<"workspaces">, table: WipeTable) {
  switch (table) {
    case "bots":
      return deleteRows(ctx, "bots", workspaceId);
    case "routines":
      return deleteRows(ctx, "routines", workspaceId);
    case "runs":
      return deleteRows(ctx, "runs", workspaceId);
    case "tasks":
      return deleteRows(ctx, "tasks", workspaceId);
    case "sources":
      return deleteRows(ctx, "sources", workspaceId);
    case "syncLinks":
      return deleteRows(ctx, "syncLinks", workspaceId);
    case "ingestRuns":
      return deleteRows(ctx, "ingestRuns", workspaceId);
    case "instructions":
      return deleteRows(ctx, "instructions", workspaceId);
    case "webhookDeliveries":
      return deleteRows(ctx, "webhookDeliveries", workspaceId);
    case "botWebhooks":
      return deleteRows(ctx, "botWebhooks", workspaceId);
    default: {
      const unexpected: never = table;
      throw new Error(unexpected);
    }
  }
}

async function deleteRows(
  ctx: MutationCtx,
  table: "bots" | "routines" | "runs" | "tasks" | "sources" | "syncLinks" | "ingestRuns" | "instructions" | "webhookDeliveries" | "botWebhooks",
  workspaceId: Id<"workspaces">,
) {
  for (let pass = 0; pass < 20; pass += 1) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .take(100);
    if (rows.length === 0) return;
    for (const row of rows) await ctx.db.delete(row._id);
  }
}
