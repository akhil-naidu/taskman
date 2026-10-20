import { v } from "convex/values";
import { requireUser } from "./guard";
import { mutation, query } from "./_generated/server";

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
