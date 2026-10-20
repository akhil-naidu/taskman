import { v } from "convex/values";
import { integrationProvider } from "./schema";
import { requireMember } from "./guard";
import {
  authorizeUrl,
  encryptString,
  isIntegrationProvider,
  oauthClient,
  randomToken,
  sanitizeConfig,
  secretHint,
} from "./model/secrets";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";

const listed = v.object({
  provider: integrationProvider,
  hint: v.string(),
  config: v.string(),
  updatedAt: v.number(),
});

export const list = query({
  args: { workspaceId: v.id("workspaces") },
  returns: v.array(listed),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const rows = await ctx.db
      .query("credentials")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .take(20);
    return rows.map((row) => ({
      provider: row.provider,
      hint: row.hint,
      config: row.config,
      updatedAt: row.updatedAt,
    }));
  },
});

export const save = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    provider: integrationProvider,
    token: v.string(),
    config: v.optional(v.string()),
  },
  returns: v.object({ hint: v.string() }),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const material = process.env.TASKMAN_ENCRYPTION_KEY;
    if (!material) throw new Error("TASKMAN_ENCRYPTION_KEY is not set");
    const token = args.token.trim();
    if (!token) throw new Error("Token is required");
    const sealed = await encryptString(token, material);
    const config = sanitizeConfig(args.config);
    const hint = secretHint(token);
    const existing = await ctx.db
      .query("credentials")
      .withIndex("by_workspace_provider", (q) => q.eq("workspaceId", args.workspaceId).eq("provider", args.provider))
      .unique();
    const patch = { hint, ciphertext: sealed.ciphertext, iv: sealed.iv, config, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("credentials", { workspaceId: args.workspaceId, provider: args.provider, ...patch });
    return { hint };
  },
});

export const remove = mutation({
  args: { workspaceId: v.id("workspaces"), provider: integrationProvider },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const existing = await ctx.db
      .query("credentials")
      .withIndex("by_workspace_provider", (q) => q.eq("workspaceId", args.workspaceId).eq("provider", args.provider))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});

export const beginOauth = mutation({
  args: { workspaceId: v.id("workspaces"), provider: integrationProvider },
  returns: v.union(
    v.object({ configured: v.literal(false) }),
    v.object({ configured: v.literal(true), url: v.string() }),
  ),
  handler: async (ctx, args) => {
    const userId = await requireMember(ctx, args.workspaceId);
    const client = oauthClient(process.env, args.provider);
    const redirectBase = process.env.CONVEX_SITE_URL;
    if (!client || !redirectBase) return { configured: false as const };
    const state = randomToken();
    await ctx.db.insert("oauthStates", {
      state,
      workspaceId: args.workspaceId,
      userId,
      provider: args.provider,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    const url = authorizeUrl(args.provider, client.clientId, `${redirectBase.replace(/\/$/, "")}/oauth/callback`, state);
    if (!url) return { configured: false as const };
    return { configured: true as const, url };
  },
});

export const takeOauthState = internalMutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("oauthStates").withIndex("by_state", (q) => q.eq("state", args.state)).unique();
    if (!row) return null;
    await ctx.db.delete(row._id);
    if (row.expiresAt < Date.now()) return null;
    return { workspaceId: row.workspaceId, userId: row.userId, provider: row.provider };
  },
});

export const storeOauthSecret = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    provider: integrationProvider,
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_user", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", args.userId))
      .unique();
    if (!member) throw new Error("Unauthorized");
    const material = process.env.TASKMAN_ENCRYPTION_KEY;
    if (!material) throw new Error("TASKMAN_ENCRYPTION_KEY is not set");
    const sealed = await encryptString(args.token, material);
    const hint = secretHint(args.token);
    const existing = await ctx.db
      .query("credentials")
      .withIndex("by_workspace_provider", (q) => q.eq("workspaceId", args.workspaceId).eq("provider", args.provider))
      .unique();
    const patch = { hint, ciphertext: sealed.ciphertext, iv: sealed.iv, config: "{}", updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("credentials", { workspaceId: args.workspaceId, provider: args.provider, ...patch });
  },
});

async function exchangeCode(provider: string, code: string, redirectUri: string, clientId: string, clientSecret: string): Promise<string> {
  if (provider === "clickup") {
    const url = new URL("https://api.clickup.com/api/v2/oauth/token");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("client_secret", clientSecret);
    url.searchParams.set("code", code);
    const response = await fetch(url, { method: "POST" });
    if (!response.ok) throw new Error("OAuth token exchange failed");
    const body: unknown = await response.json();
    const token = body && typeof body === "object" && "access_token" in body ? body.access_token : undefined;
    if (typeof token !== "string" || !token) throw new Error("OAuth token exchange failed");
    return token;
  }
  const endpoint =
    provider === "github"
      ? "https://github.com/login/oauth/access_token"
      : provider === "linear"
        ? "https://api.linear.app/oauth/token"
        : provider === "dropbox"
          ? "https://api.dropboxapi.com/oauth2/token"
          : "";
  if (!endpoint) throw new Error("OAuth is not available for this provider");
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error("OAuth token exchange failed");
  const payload: unknown = await response.json();
  const token = payload && typeof payload === "object" && "access_token" in payload ? payload.access_token : undefined;
  if (typeof token !== "string" || !token) throw new Error("OAuth token exchange failed");
  return token;
}

export const completeOauth = internalAction({
  args: { code: v.string(), state: v.string() },
  returns: v.object({ provider: v.string() }),
  handler: async (ctx, args): Promise<{ provider: string }> => {
    const pending: { workspaceId: Id<"workspaces">; userId: Id<"users">; provider: string } | null = await ctx.runMutation(
      internal.credentials.takeOauthState,
      { state: args.state },
    );
    if (!pending || !isIntegrationProvider(pending.provider)) throw new Error("OAuth state is invalid");
    const client = oauthClient(process.env, pending.provider);
    const redirectBase = process.env.CONVEX_SITE_URL;
    if (!client || !redirectBase) throw new Error("OAuth client is not configured");
    const token = await exchangeCode(
      pending.provider,
      args.code,
      `${redirectBase.replace(/\/$/, "")}/oauth/callback`,
      client.clientId,
      client.clientSecret,
    );
    await ctx.runMutation(internal.credentials.storeOauthSecret, {
      workspaceId: pending.workspaceId,
      userId: pending.userId,
      provider: pending.provider,
      token,
    });
    return { provider: pending.provider };
  },
});

export const openSecret = internalQuery({
  args: { workspaceId: v.id("workspaces"), userId: v.id("users"), provider: integrationProvider },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_user", (q) => q.eq("workspaceId", args.workspaceId).eq("userId", args.userId))
      .unique();
    if (!member) return null;
    const row = await ctx.db
      .query("credentials")
      .withIndex("by_workspace_provider", (q) => q.eq("workspaceId", args.workspaceId).eq("provider", args.provider))
      .unique();
    if (!row) return null;
    return { ciphertext: row.ciphertext, iv: row.iv, config: row.config };
  },
});
