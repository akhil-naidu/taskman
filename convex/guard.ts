import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function requireUser(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

export async function requireMember(ctx: Ctx, workspaceId: Id<"workspaces">): Promise<Id<"users">> {
  const userId = await requireUser(ctx);
  const member = await ctx.db
    .query("members")
    .withIndex("by_workspace_user", (q) => q.eq("workspaceId", workspaceId).eq("userId", userId))
    .unique();
  if (!member) throw new Error("Unauthorized");
  return userId;
}

export async function requireOwner(ctx: Ctx, workspaceId: Id<"workspaces">): Promise<Id<"users">> {
  const userId = await requireUser(ctx);
  const member = await ctx.db
    .query("members")
    .withIndex("by_workspace_user", (q) => q.eq("workspaceId", workspaceId).eq("userId", userId))
    .unique();
  if (!member || member.role !== "owner") throw new Error("Unauthorized");
  return userId;
}
