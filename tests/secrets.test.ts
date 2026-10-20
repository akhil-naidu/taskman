import { describe, expect, it } from "vitest";
import {
  authorizeUrl,
  decryptString,
  encryptString,
  findActiveToken,
  oauthClient,
  sanitizeConfig,
  sha256Hex,
} from "../convex/model/secrets";

const key = Buffer.from(new Uint8Array(32).map((_, index) => index + 1)).toString("base64");

describe("workspace secrets", () => {
  it("encrypts a credential so the stored value is not the token", async () => {
    const sealed = await encryptString("clickup-token-value", key);
    expect(sealed.ciphertext).not.toContain("clickup-token-value");
    expect(await decryptString(sealed.ciphertext, sealed.iv, key)).toBe("clickup-token-value");
    await expect(decryptString(sealed.ciphertext, sealed.iv, Buffer.from(new Uint8Array(32)).toString("base64"))).rejects.toThrow();
  });

  it("drops secret fields from connection config", () => {
    expect(sanitizeConfig(JSON.stringify({ teamId: "team-1", token: "hidden", listIds: "a, b" }))).toBe(
      JSON.stringify({ teamId: "team-1", listIds: "a, b" }),
    );
  });

  it("matches a workspace ingest token by hash and rejects a revoked one", async () => {
    const hash = await sha256Hex("raw-token");
    const rows = [
      { tokenHash: hash, workspaceId: "workspace-a" },
      { tokenHash: await sha256Hex("other"), workspaceId: "workspace-b", revokedAt: 1 },
    ];
    expect(findActiveToken(rows, hash)?.workspaceId).toBe("workspace-a");
    expect(findActiveToken(rows, await sha256Hex("other"))).toBeNull();
    expect(findActiveToken(rows, "missing")).toBeNull();
  });

  it("does not build an OAuth URL without a platform client", () => {
    expect(oauthClient({}, "clickup")).toBeNull();
    expect(oauthClient({ TASKMAN_OAUTH_GITHUB_CLIENT_ID: "id" }, "github")).toBeNull();
    expect(authorizeUrl("jira", "id", "https://example.com/oauth/callback", "state")).toBeNull();
    const url = authorizeUrl("linear", "client", "https://example.com/oauth/callback", "state");
    expect(url).toContain("scope=read");
    expect(url).not.toContain("client_secret");
  });
});
