import { v } from "convex/values";
import { requireMember } from "./guard";
import { CODE_TTL_SECONDS, codeExchangeAllowed, newTokenPair, READ_SCOPE } from "./model/oauth";
import { randomToken, sha256Hex } from "./model/secrets";
import { mutation, query } from "./_generated/server";

const failure = v.object({ ok: v.literal(false), error: v.string() });

export const clientPreview = query({
  args: { clientId: v.string(), redirectUri: v.string() },
  handler: async (ctx, args) => {
    const client = await ctx.db
      .query("oauthClients")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();
    if (!client) return null;
    return { name: client.clientName, redirectOk: client.redirectUris.includes(args.redirectUri) };
  },
});

export const registerClient = mutation({
  args: {
    clientName: v.string(),
    redirectUris: v.array(v.string()),
    tokenEndpointAuthMethod: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = randomToken();
    const secret = args.tokenEndpointAuthMethod === "none" ? "" : randomToken();
    const clientSecretHash = secret ? await sha256Hex(secret) : undefined;
    await ctx.db.insert("oauthClients", {
      clientId,
      ...(clientSecretHash ? { clientSecretHash } : {}),
      clientName: args.clientName,
      redirectUris: args.redirectUris,
      tokenEndpointAuthMethod: args.tokenEndpointAuthMethod,
      createdAt: Date.now(),
    });
    return {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: args.clientName,
      redirect_uris: args.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: args.tokenEndpointAuthMethod,
      ...(secret ? { client_secret: secret } : {}),
    };
  },
});

export const createCode = mutation({
  args: {
    clientId: v.string(),
    redirectUri: v.string(),
    codeChallenge: v.string(),
    scopes: v.array(v.string()),
    resource: v.string(),
    workspaceId: v.id("workspaces"),
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireMember(ctx, args.workspaceId);
    const client = await ctx.db
      .query("oauthClients")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();
    if (!client || !client.redirectUris.includes(args.redirectUri)) throw new Error("invalid_request");
    if (!args.scopes.includes(READ_SCOPE)) throw new Error("invalid_scope");
    const code = randomToken();
    await ctx.db.insert("oauthCodes", {
      codeHash: await sha256Hex(code),
      clientId: args.clientId,
      userId,
      workspaceId: args.workspaceId,
      redirectUri: args.redirectUri,
      codeChallenge: args.codeChallenge,
      scopes: args.scopes,
      resource: args.resource,
      expiresAt: Date.now() + CODE_TTL_SECONDS * 1000,
    });
    const target = new URL(args.redirectUri);
    target.searchParams.set("code", code);
    if (args.state) target.searchParams.set("state", args.state);
    return { redirect: target.toString() };
  },
});

export const exchange = mutation({
  args: {
    grantType: v.string(),
    code: v.optional(v.string()),
    redirectUri: v.optional(v.string()),
    clientId: v.string(),
    clientSecret: v.optional(v.string()),
    codeVerifier: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    resource: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      access_token: v.string(),
      refresh_token: v.string(),
      token_type: v.literal("Bearer"),
      expires_in: v.number(),
      scope: v.string(),
    }),
    failure,
  ),
  handler: async (ctx, args) => {
    const client = await ctx.db
      .query("oauthClients")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .unique();
    if (!client) return { ok: false as const, error: "invalid_client" };
    if (client.tokenEndpointAuthMethod !== "none") {
      const presented = args.clientSecret ?? "";
      const hash = presented ? await sha256Hex(presented) : "";
      if (!client.clientSecretHash || hash !== client.clientSecretHash) return { ok: false as const, error: "invalid_client" };
    }
    const now = Date.now();
    if (args.grantType === "refresh_token") {
      const refreshHash = args.refreshToken ? await sha256Hex(args.refreshToken) : "";
      const row = refreshHash
        ? await ctx.db.query("oauthTokens").withIndex("by_tokenHash", (q) => q.eq("tokenHash", refreshHash)).unique()
        : null;
      if (!row || row.kind !== "refresh" || row.revokedAt || row.expiresAt <= now || row.clientId !== args.clientId) {
        return { ok: false as const, error: "invalid_grant" };
      }
      const issued = await newTokenPair({ userId: row.userId, workspaceId: row.workspaceId, scopes: row.scopes }, now);
      await ctx.db.patch(row._id, { revokedAt: now });
      await ctx.db.insert("oauthTokens", {
        tokenHash: issued.access.record.tokenHash,
        kind: "access",
        clientId: row.clientId,
        userId: row.userId,
        workspaceId: row.workspaceId,
        scopes: row.scopes,
        expiresAt: issued.access.record.expiresAt,
      });
      await ctx.db.insert("oauthTokens", {
        tokenHash: issued.refresh.record.tokenHash,
        kind: "refresh",
        clientId: row.clientId,
        userId: row.userId,
        workspaceId: row.workspaceId,
        scopes: row.scopes,
        expiresAt: issued.refresh.record.expiresAt,
      });
      return tokenResponse(issued.access.raw, issued.refresh.raw, row.scopes);
    }
    if (args.grantType !== "authorization_code" || !args.code || !args.redirectUri || !args.codeVerifier) {
      return { ok: false as const, error: "invalid_grant" };
    }
    const codeHash = await sha256Hex(args.code);
    const code = await ctx.db.query("oauthCodes").withIndex("by_codeHash", (q) => q.eq("codeHash", codeHash)).unique();
    if (!code || code.clientId !== args.clientId) return { ok: false as const, error: "invalid_grant" };
    const allowed = await codeExchangeAllowed({
      codeChallenge: code.codeChallenge,
      verifier: args.codeVerifier,
      redirectUri: args.redirectUri,
      storedRedirect: code.redirectUri,
      expiresAt: code.expiresAt,
      consumedAt: code.consumedAt,
      now,
    });
    if (!allowed.ok) return { ok: false as const, error: allowed.error };
    if (args.resource && code.resource && args.resource !== code.resource) return { ok: false as const, error: "invalid_target" };
    await ctx.db.patch(code._id, { consumedAt: now });
    const issued = await newTokenPair({ userId: code.userId, workspaceId: code.workspaceId, scopes: code.scopes }, now);
    await ctx.db.insert("oauthTokens", {
      tokenHash: issued.access.record.tokenHash,
      kind: "access",
      clientId: code.clientId,
      userId: code.userId,
      workspaceId: code.workspaceId,
      scopes: code.scopes,
      expiresAt: issued.access.record.expiresAt,
    });
    await ctx.db.insert("oauthTokens", {
      tokenHash: issued.refresh.record.tokenHash,
      kind: "refresh",
      clientId: code.clientId,
      userId: code.userId,
      workspaceId: code.workspaceId,
      scopes: code.scopes,
      expiresAt: issued.refresh.record.expiresAt,
    });
    return tokenResponse(issued.access.raw, issued.refresh.raw, code.scopes);
  },
});

function tokenResponse(access: string, refresh: string, scopes: string[]) {
  return {
    ok: true as const,
    access_token: access,
    refresh_token: refresh,
    token_type: "Bearer" as const,
    expires_in: 3600,
    scope: scopes.join(" "),
  };
}
