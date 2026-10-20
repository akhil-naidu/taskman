import type { RemoteTask, SyncProvider, TaskStatus } from "./types";

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string> },
) => Promise<Response>;

export type SyncPullInput = {
  token?: string;
  teamId?: string;
  listIds?: string[];
  fetchImpl?: FetchLike;
};

export type PullResult = {
  provider: SyncProvider;
  implemented: boolean;
  tasks: RemoteTask[];
  message?: string;
};

export interface SyncAdapter {
  provider: SyncProvider;
  readOnly: true;
  pull(input: SyncPullInput): Promise<PullResult>;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 5;

type ClickUpTask = {
  id?: string;
  name?: string;
  url?: string;
  status?: { status?: string; type?: string };
  assignees?: { username?: string }[];
};

export function mapClickUpStatus(status: { status?: string; type?: string } | undefined): TaskStatus {
  const name = (status?.status ?? "").toLowerCase();
  const type = (status?.type ?? "").toLowerCase();
  if (type === "closed" || name === "closed" || name === "complete" || name === "done") return "done";
  if (name.includes("wait")) return "waiting";
  if (name.includes("progress")) return "in_progress";
  return "todo";
}

function taskUrl(kind: "list" | "team", id: string, page: number): string {
  return `https://api.clickup.com/api/v2/${kind}/${encodeURIComponent(id)}/task?page=${page}&include_closed=true`;
}

async function fetchPage(fetchImpl: FetchLike, token: string, url: string): Promise<ClickUpTask[]> {
  const response = await fetchImpl(url, { method: "GET", headers: { Authorization: token } });
  if (!response.ok) throw new Error(`ClickUp returned ${response.status}`);
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("tasks" in body) || !Array.isArray(body.tasks)) {
    throw new Error("ClickUp returned an unexpected payload");
  }
  return body.tasks as ClickUpTask[];
}

export async function pullClickUp(input: SyncPullInput): Promise<PullResult> {
  const listIds = (input.listIds ?? []).map((id) => id.trim()).filter(Boolean);
  const teamId = input.teamId?.trim() ?? "";
  if (!input.token) {
    return { provider: "clickup", implemented: true, tasks: [], message: "ClickUp is not connected" };
  }
  if (listIds.length === 0 && !teamId) {
    return {
      provider: "clickup",
      implemented: true,
      tasks: [],
      message: "Set a list id or team id on the ClickUp connection",
    };
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const targets = listIds.length > 0 ? listIds.map((id) => ({ kind: "list" as const, id })) : [{ kind: "team" as const, id: teamId }];
  const tasks: RemoteTask[] = [];
  for (const target of targets) {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const batch = await fetchPage(fetchImpl, input.token, taskUrl(target.kind, target.id, page));
      for (const task of batch) {
        if (!task.id || !task.name) continue;
        tasks.push({
          externalId: task.id,
          title: task.name,
          url: task.url,
          status: mapClickUpStatus(task.status),
          ownerLabel: task.assignees?.find((assignee) => assignee.username)?.username,
        });
      }
      if (batch.length < PAGE_SIZE) break;
    }
  }
  return { provider: "clickup", implemented: true, tasks };
}

function stub(provider: SyncProvider, message: string): SyncAdapter {
  return {
    provider,
    readOnly: true,
    pull() {
      return Promise.resolve({ provider, implemented: false, tasks: [], message });
    },
  };
}

export const clickupAdapter: SyncAdapter = {
  provider: "clickup",
  readOnly: true,
  pull: pullClickUp,
};

export const githubIssuesAdapter = stub(
  "github",
  "GitHub Issues adapter is not implemented. Read-only stub; there is no write-back.",
);
export const linearAdapter = stub(
  "linear",
  "Linear adapter is not implemented. Read-only stub; there is no write-back.",
);
export const jiraAdapter = stub(
  "jira",
  "Jira adapter is not implemented. Read-only stub; there is no write-back.",
);

export const syncAdapters = {
  clickup: clickupAdapter,
  github: githubIssuesAdapter,
  linear: linearAdapter,
  jira: jiraAdapter,
} as const;

export function adapterFor(provider: SyncProvider): SyncAdapter {
  return syncAdapters[provider];
}
