import { describe, expect, it, vi } from "vitest";
import { emptyState, planRemoteTasks } from "../convex/model/store";
import {
  adapterFor,
  clickupAdapter,
  githubIssuesAdapter,
  jiraAdapter,
  linearAdapter,
  mapClickUpStatus,
  pullClickUp,
  syncAdapters,
} from "../convex/model/sync";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("sync adapters", () => {
  it("exposes read-only adapters and leaves the other providers as stubs", async () => {
    const fetchImpl = vi.fn();
    for (const adapter of Object.values(syncAdapters)) {
      expect(adapter.readOnly).toBe(true);
      expect(Object.keys(adapter).sort()).toEqual(["provider", "pull", "readOnly"]);
    }
    const github = await githubIssuesAdapter.pull({ token: "secret", fetchImpl });
    const linear = await linearAdapter.pull({ token: "secret", fetchImpl });
    const jira = await jiraAdapter.pull({ token: "secret", fetchImpl });
    expect(github.implemented).toBe(false);
    expect(linear.implemented).toBe(false);
    expect(jira.implemented).toBe(false);
    expect(github.tasks).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(adapterFor("github")).toBe(githubIssuesAdapter);
  });

  it("does not call ClickUp without a token or a list", async () => {
    const fetchImpl = vi.fn();
    const missingToken = await pullClickUp({ listIds: ["list-1"], fetchImpl });
    const missingTarget = await pullClickUp({ token: "token", fetchImpl });
    expect(missingToken.tasks).toEqual([]);
    expect(missingTarget.message).toMatch(/CLICKUP_LIST_IDS/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps ClickUp tasks with GET requests and paginates full pages", async () => {
    expect(mapClickUpStatus({ status: "in progress", type: "custom" })).toBe("in_progress");
    expect(mapClickUpStatus({ status: "complete", type: "closed" })).toBe("done");
    expect(mapClickUpStatus({ status: "waiting on review", type: "custom" })).toBe("waiting");
    expect(mapClickUpStatus({ status: "to do", type: "open" })).toBe("todo");

    const page = (count: number, start = 0) =>
      jsonResponse({
        tasks: Array.from({ length: count }, (_, index) => ({
          id: `cu-${start + index}`,
          name: `Sample ${start + index}`,
          url: `https://example.com/tasks/cu-${start + index}`,
          status: { status: "to do", type: "open" },
          assignees: [{ username: "dev-1" }],
        })),
      });
    const fetchImpl = vi.fn(async (url: string, init?: { method?: string; headers?: Record<string, string> }) => {
      expect(init?.method).toBe("GET");
      expect(init?.headers?.Authorization).toBe("token-value");
      expect(url).toContain("include_closed=true");
      expect(url).not.toContain("token-value");
      return url.includes("page=0") ? page(100, 0) : page(1, 100);
    });
    const result = await clickupAdapter.pull({ token: "token-value", listIds: ["list 1"], fetchImpl });
    expect(result.implemented).toBe(true);
    expect(result.tasks).toHaveLength(101);
    expect(result.tasks[0]).toMatchObject({
      externalId: "cu-0",
      status: "todo",
      ownerLabel: "dev-1",
      url: "https://example.com/tasks/cu-0",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("/list/list%201/task");
  });

  it("upserts remote tasks by source id", () => {
    const input = {
      provider: "clickup" as const,
      tasks: [{ externalId: "cu-9", title: "Fix the sample gate", status: "in_progress" as const, url: "https://example.com/t/cu-9" }],
    };
    const once = planRemoteTasks(emptyState(), input, { now: 5 });
    const renamed = planRemoteTasks(once, { ...input, tasks: [{ ...input.tasks[0]!, title: "Fix the sample gate again" }] }, { now: 5 });
    expect(renamed.tasks.filter((task) => task.sourceKey === "clickup")).toHaveLength(1);
    expect(renamed.tasks[0]?.title).toBe("Fix the sample gate again");
    expect(renamed.syncLinks).toHaveLength(1);
    expect(renamed).toEqual(planRemoteTasks(renamed, { ...input, tasks: [{ ...input.tasks[0]!, title: "Fix the sample gate again" }] }, { now: 5 }));
  });
});
