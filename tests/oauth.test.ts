import { describe, expect, it } from "vitest";
import { boardColumn } from "../convex/model/columns";
import {
  assessGrant,
  authorizationServerMetadata,
  codeExchangeAllowed,
  newTokenPair,
  parseRegistration,
  protectedResourceMetadata,
  resolveCredential,
  s256Challenge,
  wwwAuthenticate,
} from "../convex/model/oauth";

describe("oauth grants", () => {
  it("rejects a registration without a redirect URI", () => {
    expect(parseRegistration({ client_name: "Grok" }).ok).toBe(false);
    const parsed = parseRegistration({ client_name: "Grok", redirect_uris: ["https://client.example/callback"] });
    expect(parsed.ok).toBe(true);
  });

  it("stores a hash mapped to the user, workspace, and scopes", async () => {
    const now = 1_000;
    const issued = await newTokenPair({ userId: "user-1", workspaceId: "workspace-1", scopes: ["board:read", "board:write"] }, now);
    expect(issued.access.record.tokenHash).not.toBe(issued.access.raw);
    expect(JSON.stringify(issued.access.record)).not.toContain(issued.access.raw);
    expect(issued.access.record.userId).toBe("user-1");
    expect(issued.access.record.workspaceId).toBe("workspace-1");
    expect(issued.access.record.scopes).toEqual(["board:read", "board:write"]);
    const read = assessGrant({ ...issued.access.record, scopes: ["board:read"] }, "claim_task", now);
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.status).toBe(403);
    const revoked = assessGrant({ ...issued.access.record, revokedAt: now }, "list_board", now + 1);
    expect(revoked.ok).toBe(false);
    if (!revoked.ok) expect(revoked.status).toBe(401);
    const unknown = assessGrant(null, "list_board", now);
    expect(unknown.ok).toBe(false);
  });

  it("rejects a verifier that does not match the challenge", async () => {
    const verifier = "a".repeat(50);
    const challenge = await s256Challenge(verifier);
    const ok = await codeExchangeAllowed({
      codeChallenge: challenge,
      verifier,
      redirectUri: "https://client.example/callback",
      storedRedirect: "https://client.example/callback",
      expiresAt: 5_000,
      now: 1_000,
    });
    expect(ok.ok).toBe(true);
    const mismatch = await codeExchangeAllowed({
      codeChallenge: challenge,
      verifier: "b".repeat(50),
      redirectUri: "https://client.example/callback",
      storedRedirect: "https://client.example/callback",
      expiresAt: 5_000,
      now: 1_000,
    });
    expect(mismatch.ok).toBe(false);
  });

  it("accepts a workspace ingest token and rejects a revoked one", () => {
    const allowed = resolveCredential(null, { workspaceId: "workspace-1", canWrite: false }, "list_board", 10);
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.workspaceId).toBe("workspace-1");
    const revoked = resolveCredential(null, { workspaceId: "workspace-1", canWrite: true, revokedAt: 1 }, "list_board", 10);
    expect(revoked.ok).toBe(false);
    if (!revoked.ok) expect(revoked.status).toBe(401);
  });

  it("publishes the resource metadata and the unauthorized challenge", () => {
    const resource = protectedResourceMetadata("https://taskman.example");
    expect(resource.resource).toBe("https://taskman.example/api/mcp");
    expect(resource.authorization_servers).toEqual(["https://taskman.example"]);
    const server = authorizationServerMetadata("https://taskman.example");
    expect(server.code_challenge_methods_supported).toContain("S256");
    expect(server.grant_types_supported).toContain("authorization_code");
    expect(wwwAuthenticate("https://taskman.example")).toContain("/.well-known/oauth-protected-resource");
  });

  it("maps legacy todo tasks into the backlog column", () => {
    expect(boardColumn({ status: "todo" })).toBe("backlog");
    expect(boardColumn({ status: "approved" })).toBe("approved");
    expect(boardColumn({ status: "in_progress", needsHuman: true })).toBe("waiting_human");
    expect(boardColumn({ status: "done", needsHuman: true })).toBe("done");
  });
});
