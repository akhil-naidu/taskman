import { v } from "convex/values";
import { requireMember } from "./guard";
import { randomToken, sha256Hex } from "./model/secrets";
import { internalQuery, mutation, query } from "./_generated/server";

export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const rows = await ctx.db
      .query("ingestTokens")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .take(50);
    return rows.map((row) => ({
      id: row._id,
      name: row.name,
      hint: row.hint,
      revokedAt: row.revokedAt ?? null,
      createdAt: row.createdAt,
    }));
  },
});

export const create = mutation({
  args: { workspaceId: v.id("workspaces"), name: v.string() },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const name = args.name.trim().slice(0, 80);
    if (!name) throw new Error("Name is required");
    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    await ctx.db.insert("ingestTokens", {
      workspaceId: args.workspaceId,
      name,
      tokenHash,
      hint: token.slice(-4),
      createdAt: Date.now(),
    });
    return { token, hint: token.slice(-4) };
  },
});

export const revoke = mutation({
  args: { workspaceId: v.id("workspaces"), tokenId: v.id("ingestTokens") },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const row = await ctx.db.get(args.tokenId);
    if (!row || row.workspaceId !== args.workspaceId) throw new Error("Not found");
    await ctx.db.patch(row._id, { revokedAt: Date.now() });
    return null;
  },
});

export const lookup = internalQuery({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("ingestTokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();
    if (!row || row.revokedAt) return null;
    return { workspaceId: row.workspaceId };
  },
});
