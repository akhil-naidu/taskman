import { orgSlug } from "./orgs";
import { emptyState } from "./store";
import type { BotStatus, FleetState, TaskStatus } from "./types";
import { rowsToView } from "./view";

const TASK_STATUSES: TaskStatus[] = ["waiting", "todo", "in_progress", "done"];
const BOT_STATUSES: BotStatus[] = ["waiting", "active", "routine", "on-demand"];
const WRITE_TOOLS = new Set(["claim_task", "update_task_status", "report_bot_status"]);

export type McpToken = { canWrite: boolean } | null;

type JsonRpc = {
  jsonrpc: "2.0";
  id?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
};

export type McpOutcome = {
  httpStatus: number;
  body: JsonRpc | null;
  nextState: FleetState | null;
};

type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent: unknown;
  isError?: boolean;
};

export function bearerToken(authorization: string | null): string {
  const match = (authorization ?? "").match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export function originAllowed(origin: string | null, siteUrl: string | undefined): boolean {
  if (!origin) return true;
  const allowed = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);
  if (siteUrl) {
    try {
      allowed.add(new URL(siteUrl).origin);
    } catch {
      return false;
    }
  }
  return allowed.has(origin);
}

export function protocolVersionAllowed(header: string | null): boolean {
  if (!header) return true;
  return header === "2025-06-18" || header === "2025-03-26";
}

export function methodOf(message: unknown): string {
  if (!message || typeof message !== "object" || Array.isArray(message)) return "";
  const method = (message as { method?: unknown }).method;
  return typeof method === "string" ? method : "";
}

export function needsToken(method: string): boolean {
  return method === "tools/list" || method === "tools/call";
}

export function mcpHttpBody(accept: string, outcome: McpOutcome): { status: number; contentType: string | null; body: string | null } {
  if (outcome.body === null) return { status: outcome.httpStatus, contentType: null, body: null };
  const json = JSON.stringify(outcome.body);
  const wantsEvent = accept.includes("text/event-stream");
  const wantsJson = accept.includes("application/json") || accept.includes("*/*");
  if (!wantsEvent && !wantsJson) {
    return {
      status: 406,
      contentType: "application/json",
      body: JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Accept must allow JSON or event streams" } }),
    };
  }
  if (wantsJson) return { status: outcome.httpStatus, contentType: "application/json", body: json };
  return { status: outcome.httpStatus, contentType: "text/event-stream", body: `event: message\ndata: ${json}\n\n` };
}

export function handleMcpMessage(message: unknown, token: McpToken, state: FleetState, now = Date.now()): McpOutcome {
  if (Array.isArray(message) || !message || typeof message !== "object") {
    return errorOutcome(400, null, -32600, "Invalid request");
  }
  const body = message as { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };
  const id = "id" in body ? body.id : undefined;
  if (body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return errorOutcome(400, id ?? null, -32600, "Invalid request");
  }
  if (id === undefined) return { httpStatus: 202, body: null, nextState: null };
  if (body.method === "notifications/initialized") return { httpStatus: 202, body: null, nextState: null };
  if (body.method === "initialize") {
    return ok(id, {
      protocolVersion: "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "taskman", version: "0.1.0" },
    });
  }
  if (body.method === "ping") return ok(id, {});
  if (!needsToken(body.method)) return errorOutcome(200, id, -32601, "Method not found");
  if (!token) return errorOutcome(401, id, -32001, "unauthorized");
  if (body.method === "tools/list") return ok(id, { tools: toolDefinitions() });
  if (body.method === "tools/call") return callTool(id, body.params, token, state, now);
  return errorOutcome(200, id, -32601, "Method not found");
}

function callTool(id: unknown, params: unknown, token: { canWrite: boolean }, state: FleetState, now: number): McpOutcome {
  const record = params && typeof params === "object" ? (params as { name?: unknown; arguments?: unknown }) : {};
  const name = typeof record.name === "string" ? record.name : "";
  const args = record.arguments && typeof record.arguments === "object" ? (record.arguments as Record<string, unknown>) : {};
  if (!name) return errorOutcome(200, id, -32602, "Invalid params");
  if (WRITE_TOOLS.has(name) && !token.canWrite) return errorOutcome(403, id, -32002, "write is not granted");
  if (WRITE_TOOLS.has(name)) {
    const applied = applyWrite(name, args, state, now);
    return {
      httpStatus: 200,
      body: { jsonrpc: "2.0", id, result: applied.result },
      nextState: applied.nextState,
    };
  }
  return { httpStatus: 200, body: { jsonrpc: "2.0", id, result: applyRead(name, args, state, now) }, nextState: null };
}

function applyRead(name: string, args: Record<string, unknown>, state: FleetState, now: number): ToolResult {
  const view = rowsToView(state, now);
  if (name === "list_bots") return result(view.bots.map(publicBot));
  if (name === "get_bot") {
    const bot = view.bots.find((item) => item.key === stringArg(args, "key"));
    return bot ? result(publicBot(bot)) : missing("Bot was not found");
  }
  if (name === "list_tasks") return result(filterTasks(view.tasks, args).map(publicTask));
  if (name === "get_task") {
    const task = view.tasks.find((item) => item.key === stringArg(args, "key"));
    return task ? result(publicTask(task)) : missing("Task was not found");
  }
  if (name === "list_waiting_on_owner") return result(view.tasks.filter((task) => task.status === "waiting").map(publicTask));
  if (name === "list_conflicts") return result(view.tasks.filter((task) => task.conflict).map(publicTask));
  return missing("Tool was not found");
}

function applyWrite(name: string, args: Record<string, unknown>, state: FleetState, now: number): { result: ToolResult; nextState: FleetState | null } {
  if (name === "claim_task") return claimTask(args, state, now);
  if (name === "update_task_status") return updateTaskStatus(args, state, now);
  if (name === "report_bot_status") return reportBotStatus(args, state, now);
  return { result: missing("Tool was not found"), nextState: null };
}

function claimTask(args: Record<string, unknown>, state: FleetState, now: number): { result: ToolResult; nextState: FleetState | null } {
  const key = stringArg(args, "key");
  const owner = stringArg(args, "owner");
  const task = state.tasks.find((item) => item.key === key);
  const bot = state.bots.find((item) => item.key === owner);
  if (!task) return { result: missing("Task was not found"), nextState: null };
  if (!bot) return { result: missing("Bot was not found"), nextState: null };
  if (task.ownerBotKey && task.ownerBotKey !== owner) {
    const claimantKeys = task.claimantKeys.includes(owner) ? task.claimantKeys : [...task.claimantKeys, owner];
    const next = replaceTask(state, { ...task, conflict: true, claimantKeys, updatedAt: now });
    return { result: result({ conflict: true, key: task.key, owner: task.ownerBotKey, ownerLabel: task.ownerLabel }), nextState: next };
  }
  const next = replaceTask(state, {
    ...task,
    ownerBotKey: owner,
    ownerLabel: bot.name,
    conflict: false,
    claimantKeys: [owner],
    updatedAt: now,
  });
  return { result: result({ conflict: false, key: task.key, owner, ownerLabel: bot.name }), nextState: next };
}

function updateTaskStatus(args: Record<string, unknown>, state: FleetState, now: number): { result: ToolResult; nextState: FleetState | null } {
  const key = stringArg(args, "key");
  const status = stringArg(args, "status");
  const task = state.tasks.find((item) => item.key === key);
  if (!task) return { result: missing("Task was not found"), nextState: null };
  if (!TASK_STATUSES.includes(status as TaskStatus)) return { result: missing("Status was not found"), nextState: null };
  const next = replaceTask(state, { ...task, status: status as TaskStatus, updatedAt: now });
  return { result: result({ key: task.key, status, owner: task.ownerBotKey, org: task.org }), nextState: next };
}

function reportBotStatus(args: Record<string, unknown>, state: FleetState, now: number): { result: ToolResult; nextState: FleetState | null } {
  const key = stringArg(args, "key");
  const status = stringArg(args, "status");
  const bot = state.bots.find((item) => item.key === key);
  if (!bot) return { result: missing("Bot was not found"), nextState: null };
  if (!BOT_STATUSES.includes(status as BotStatus)) return { result: missing("Status was not found"), nextState: null };
  const next: FleetState = {
    ...state,
    bots: state.bots.map((item) => (item.key === key ? { ...item, reportedStatus: status as BotStatus, updatedAt: now } : item)),
  };
  return { result: result({ key, status }), nextState: next };
}

function replaceTask(state: FleetState, task: FleetState["tasks"][number]): FleetState {
  return { ...state, tasks: state.tasks.map((item) => (item.key === task.key ? task : item)) };
}

function filterTasks(tasks: ReturnType<typeof rowsToView>["tasks"], args: Record<string, unknown>) {
  const org = stringArg(args, "org").toLowerCase();
  const owner = stringArg(args, "owner").toLowerCase();
  const status = stringArg(args, "status");
  return tasks.filter((task) => {
    if (org && task.org.toLowerCase() !== org && orgSlug(task.org) !== org) return false;
    if (owner && task.ownerBotKey?.toLowerCase() !== owner && task.ownerLabel.toLowerCase() !== owner) return false;
    if (status && task.status !== status) return false;
    return true;
  });
}

function publicBot(bot: ReturnType<typeof rowsToView>["bots"][number]) {
  return { key: bot.key, name: bot.name, org: bot.org, status: bot.status, role: bot.role };
}

function publicTask(task: ReturnType<typeof rowsToView>["tasks"][number]) {
  return {
    key: task.key,
    title: task.title,
    status: task.status,
    owner: task.ownerBotKey ?? "",
    ownerLabel: task.ownerLabel,
    org: task.org,
    conflict: task.conflict,
    urgency: task.urgency,
  };
}

function result(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data };
}

function missing(text: string): ToolResult {
  return { isError: true, content: [{ type: "text", text }], structuredContent: { error: text } };
}

function ok(id: unknown, resultBody: unknown): McpOutcome {
  return { httpStatus: 200, body: { jsonrpc: "2.0", id, result: resultBody }, nextState: null };
}

function errorOutcome(httpStatus: number, id: unknown, code: number, message: string): McpOutcome {
  return { httpStatus, body: { jsonrpc: "2.0", id, error: { code, message } }, nextState: null };
}

function stringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === "string" ? value : "";
}

function toolDefinitions() {
  const key = { type: "object", properties: { key: { type: "string" } }, required: ["key"] };
  return [
    { name: "list_bots", description: "List bots in this workspace", inputSchema: { type: "object", properties: {} } },
    { name: "get_bot", description: "Get one bot by key", inputSchema: key },
    {
      name: "list_tasks",
      description: "List tasks, optionally filtered by org, owner, and status",
      inputSchema: {
        type: "object",
        properties: {
          org: { type: "string" },
          owner: { type: "string" },
          status: { type: "string", enum: TASK_STATUSES },
        },
      },
    },
    { name: "get_task", description: "Get one task by key", inputSchema: key },
    { name: "list_waiting_on_owner", description: "List waiting tasks in this workspace", inputSchema: { type: "object", properties: {} } },
    { name: "list_conflicts", description: "List tasks marked as conflicts", inputSchema: { type: "object", properties: {} } },
    {
      name: "claim_task",
      description: "Claim a task for a bot. Does not replace another owner.",
      inputSchema: { type: "object", properties: { key: { type: "string" }, owner: { type: "string" } }, required: ["key", "owner"] },
    },
    {
      name: "update_task_status",
      description: "Change a task status",
      inputSchema: { type: "object", properties: { key: { type: "string" }, status: { type: "string", enum: TASK_STATUSES } }, required: ["key", "status"] },
    },
    {
      name: "report_bot_status",
      description: "Set a bot's reported status",
      inputSchema: { type: "object", properties: { key: { type: "string" }, status: { type: "string", enum: BOT_STATUSES } }, required: ["key", "status"] },
    },
  ];
}

export function blankState(): FleetState {
  return emptyState();
}
