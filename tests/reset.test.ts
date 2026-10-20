import { describe, expect, it } from "vitest";
import { applyWorkspaceReset, resetAllowed, resetNameMatches } from "../convex/model/reset";
import { handleMcpMessage } from "../convex/model/mcp";
import { emptyState } from "../convex/model/store";

describe("workspace reset", () => {
  it("wipes the current workspace and keeps credentials and the other workspace", () => {
    const rows = [
      { table: "tasks", workspaceId: "workspace-a", key: "task-1" },
      { table: "bots", workspaceId: "workspace-a", key: "bot-a" },
      { table: "instructions", workspaceId: "workspace-a", key: "note-1" },
      { table: "webhookDeliveries", workspaceId: "workspace-a", key: "delivery-1" },
      { table: "botWebhooks", workspaceId: "workspace-a", key: "bot-a" },
      { table: "sources", workspaceId: "workspace-a", key: "clickup" },
      { table: "syncLinks", workspaceId: "workspace-a", key: "link-1" },
      { table: "ingestRuns", workspaceId: "workspace-a", key: "latest" },
      { table: "routines", workspaceId: "workspace-a", key: "bot-a:sweep" },
      { table: "runs", workspaceId: "workspace-a", key: "run-1" },
      { table: "credentials", workspaceId: "workspace-a", key: "clickup" },
      { table: "workspaces", workspaceId: "workspace-a", key: "workspace-a" },
      { table: "members", workspaceId: "workspace-a", key: "owner" },
      { table: "tasks", workspaceId: "workspace-b", key: "task-2" },
      { table: "bots", workspaceId: "workspace-b", key: "bot-b" },
      { table: "botWebhooks", workspaceId: "workspace-b", key: "bot-b" },
    ];
    expect(applyWorkspaceReset(rows, "workspace-a")).toEqual([
      { table: "credentials", workspaceId: "workspace-a", key: "clickup" },
      { table: "workspaces", workspaceId: "workspace-a", key: "workspace-a" },
      { table: "members", workspaceId: "workspace-a", key: "owner" },
      { table: "tasks", workspaceId: "workspace-b", key: "task-2" },
      { table: "bots", workspaceId: "workspace-b", key: "bot-b" },
      { table: "botWebhooks", workspaceId: "workspace-b", key: "bot-b" },
    ]);
  });

  it("requires the owner and the exact workspace name", () => {
    expect(resetAllowed("owner")).toBe(true);
    expect(resetAllowed("member")).toBe(false);
    expect(resetNameMatches("Fleet", "Fleet")).toBe(true);
    expect(resetNameMatches("Fleet", " Fleet ")).toBe(true);
    expect(resetNameMatches("Fleet", "fleet")).toBe(false);
  });

  it("does not offer reset as an MCP tool", () => {
    const outcome = handleMcpMessage(
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "reset_workspace", arguments: { name: "Fleet" } } },
      { canWrite: true },
      emptyState(),
      1,
    );
    const text = (outcome.body?.result as { content?: { text: string }[] } | undefined)?.content?.[0]?.text;
    expect(text).toBe("Tool was not found");
    expect(outcome.nextState).toBeNull();
  });
});
