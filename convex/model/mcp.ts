import { boardColumn } from "./columns";
import { isWriteTool } from "./oauth";
import { botKey, orgColor, orgSlug } from "./orgs";
import { emptyState } from "./store";
import { stableHash } from "./text";
import type { BotRow, BotStatus, FleetState, TaskRow, TaskStatus } from "./types";
import { TASK_STATUSES } from "./types";
import { rowsToView } from "./view";

const BOT_STATUSES: BotStatus[] = ["waiting", "active", "routine", "on-demand"];

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
  if (isWriteTool(name) && !token.canWrite) return errorOutcome(403, id, -32002, "write is not granted");
  if (isWriteTool(name)) {
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
  if (name === "list_board") return result(boardListing(state));
  if (name === "get_pending_instructions") return result(pendingInstructions(state, stringArg(args, "bot")));
  return missing("Tool was not found");
}

function applyWrite(name: string, args: Record<string, unknown>, state: FleetState, now: number): { result: ToolResult; nextState: FleetState | null } {
  if (name === "claim_task") return claimTask(args, state, now);
  if (name === "update_task_status") return updateTaskStatus(args, state, now);
  if (name === "report_bot_status") return reportBotStatus(args, state, now);
  if (name === "register_bot") return registerBot(args, state, now);
  if (name === "heartbeat") return heartbeat(args, state, now);
  if (name === "create_task") return createTask(args, state, now);
  if (name === "update_task") return updateTask(args, state, now);
  if (name === "report_progress") return reportProgress(args, state, now);
  if (name === "complete_task") return completeTask(args, state, now);
  if (name === "ack_instruction") return ackInstruction(args, state, now);
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
  const started = task.status === "backlog" || task.status === "todo" || task.status === "approved";
  const next = replaceTask(state, {
    ...task,
    ownerBotKey: owner,
    ownerLabel: bot.name,
    status: started ? "in_progress" : task.status,
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

function registerBot(args: Record<string, unknown>, state: FleetState, now: number): { result: ToolResult; nextState: FleetState | null } {
  const name = stringArg(args, "name").trim();
  const role = stringArg(args, "role").trim();
  const org = (stringArg(args, "org") || stringArg(args, "area") || "fleet").trim();
  const wake = (stringArg(args, "wake") || stringArg(args, "wake_schedule") || "unspecified").trim();
  const routines = stringList(args.routines);
  if (!name || !role) return { result: missing("Name and role are required"), nextState: null };
  const key = botKey(name);
  const existing = state.bots.find((item) => item.key === key);
  const bot: BotRow = {
    key,
    name,
    description: existing?.description ?? "",
    role,
    org,
    orgColor: orgColor(org),
    avatarColor: existing?.avatarColor ?? "gray",
    avatarShape: existing?.avatarShape ?? "circle",
    wake,
    lastRunText: existing?.lastRunText ?? "",
    openCount: existing?.openCount ?? 0,
    openItems: existing?.openItems ?? [],
    activity: existing?.activity ?? [],
    notes: existing?.notes ?? [],
    ...(existing?.reportedStatus ? { reportedStatus: existing.reportedStatus } : {}),
    origin: "mcp",
    ...(existing?.heartbeatStatus ? { heartbeatStatus: existing.heartbeatStatus } : {}),
    ...(existing?.currentTaskKey ? { currentTaskKey: existing.currentTaskKey } : {}),
    ...(existing?.currentTaskText ? { currentTaskText: existing.currentTaskText } : {}),
    ...(existing?.lastHeartbeatAt ? { lastHeartbeatAt: existing.lastHeartbeatAt } : {}),
    updatedAt: now,
  };
  const bots = existing ? state.bots.map((item) => (item.key === key ? bot : item)) : [...state.bots, bot];
  const kept = state.routines.filter((item) => item.botKey !== key);
  const nextRoutines = routines.map((routine) => ({ key: `${key}:${routine}`, botKey: key, name: routine, updatedAt: now }));
  return { result: result({ key, name, role, org, wake, routines }), nextState: { ...state, bots, routines: [...kept, ...nextRoutines] } };
}

function heartbeat(args: Record<string, unknown>, state: FleetState, now: number): { result: ToolResult; nextState: FleetState | null } {
  const key = stringArg(args, "bot") || stringArg(args, "key");
  const status = stringArg(args, "status").trim();
  const current = stringArg(args, "current_task").trim();
  const lastRun = stringArg(args, "last_run").trim();
  const bot = state.bots.find((item) => item.key === key);
  if (!bot) return { result: missing("Bot was not found"), nextState: null };
  if (!status) return { result: missing("Status is required"), nextState: null };
  const task = state.tasks.find((item) => item.key === current);
  const next: BotRow = {
    ...bot,
    heartbeatStatus: status,
    currentTaskKey: task ? task.key : "",
    currentTaskText: current,
    lastRunText: lastRun || bot.lastRunText,
    lastHeartbeatAt: now,
    updatedAt: now,
  };
  return {
    result: result({ key, status, current_task: current, last_run: next.lastRunText }),
    nextState: { ...state, bots: state.bots.map((item) => (item.key === key ? next : item)) },
  };
}

function createTask(args: Record<string, unknown>, state: FleetState, now: number): { result: ToolResult; nextState: FleetState | null } {
  const title = stringArg(args, "title").trim();
  const owner = stringArg(args, "owner") || stringArg(args, "bot");
  const org = (stringArg(args, "org") || "fleet").trim();
  const bot = state.bots.find((item) => item.key === owner);
  if (!title) return { result: missing("Title is required"), nextState: null };
  if (!bot) return { result: missing("Bot was not found"), nextState: null };
  const needsHuman = boolArg(args, "needs_human");
  const question = stringArg(args, "question").trim();
  const options = stringList(args.options);
  const requested = stringArg(args, "status");
  const status = (TASK_STATUSES as readonly string[]).includes(requested) ? (requested as TaskStatus) : needsHuman ? "waiting_human" : "backlog";
  const key = `mcp:${stableHash(`${title}|${owner}|${now}`)}`;
  const task: TaskRow = {
    key,
    title: title.slice(0, 500),
    status,
    ownerBotKey: owner,
    ownerLabel: bot.name,
    org,
    orgColor: orgColor(org),
    urgency: "normal",
    claimKey: key,
    conflict: false,
    claimantKeys: [owner],
    sourceKey: "mcp",
    externalId: "",
    externalUrl: "",
    addedDate: "",
    needsHuman,
    question,
    options,
    progress: [],
    decision: "",
    updatedAt: now,
  };
  return { result: result(publicTask(taskViewFromRow(task))), nextState: { ...state, tasks: [...state.tasks, task] } };
}

function updateTask(args: Record<string, unknown>, state: FleetState, now: number): { result: ToolResult; nextState: FleetState | null } {
  const key = stringArg(args, "key");
  const task = state.tasks.find((item) => item.key === key);
  if (!task) return { result: missing("Task was not found"), nextState: null };
  const status = stringArg(args, "status");
  if (status && !(TASK_STATUSES as readonly string[]).includes(status)) return { result: missing("Status was not found"), nextState: null };
  const title = stringArg(args, "title").trim();
  const next: TaskRow = {
    ...task,
    ...(title ? { title } : {}),
    ...(status ? { status: status as TaskStatus } : {}),
    ...("needs_human" in args ? { needsHuman: boolArg(args, "needs_human") } : {}),
    ...(stringArg(args, "question") ? { question: stringArg(args, "question").trim() } : {}),
    ...(Array.isArray(args.options) ? { options: stringList(args.options) } : {}),
    updatedAt: now,
  };
  return { result: result(publicTask(taskViewFromRow(next))), nextState: replaceTask(state, next) };
}

function reportProgress(args: Record<string, unknown>, state: FleetState, now: number): { result: ToolResult; nextState: FleetState | null } {
  const key = stringArg(args, "key");
  const note = stringArg(args, "note").trim();
  const task = state.tasks.find((item) => item.key === key);
  if (!task) return { result: missing("Task was not found"), nextState: null };
  if (!note) return { result: missing("Note is required"), nextState: null };
  const progress = [...(task.progress ?? []), note.slice(0, 500)].slice(-20);
  const next = { ...task, progress, updatedAt: now };
  return { result: result({ key, progress }), nextState: replaceTask(state, next) };
}

function completeTask(args: Record<string, unknown>, state: FleetState, now: number): { result: ToolResult; nextState: FleetState | null } {
  const key = stringArg(args, "key");
  const task = state.tasks.find((item) => item.key === key);
  if (!task) return { result: missing("Task was not found"), nextState: null };
  const next = { ...task, status: "done" as const, needsHuman: false, updatedAt: now };
  return { result: result(publicTask(taskViewFromRow(next))), nextState: replaceTask(state, next) };
}

function ackInstruction(args: Record<string, unknown>, state: FleetState, now: number): { result: ToolResult; nextState: FleetState | null } {
  const key = stringArg(args, "key");
  const instruction = (state.instructions ?? []).find((item) => item.key === key);
  if (!instruction) return { result: missing("Instruction was not found"), nextState: null };
  const next = (state.instructions ?? []).map((item) => (item.key === key ? { ...item, status: "acked" as const, ackedAt: now } : item));
  return { result: result({ key, status: "acked" }), nextState: { ...state, instructions: next } };
}

function boardListing(state: FleetState) {
  const columns: Record<"backlog" | "approved" | "in_progress" | "waiting_human" | "done", ReturnType<typeof publicTask>[]> = {
    backlog: [],
    approved: [],
    in_progress: [],
    waiting_human: [],
    done: [],
  };
  for (const task of state.tasks) columns[boardColumn(task)].push(publicTask(taskViewFromRow(task)));
  return columns;
}

function pendingInstructions(state: FleetState, bot: string) {
  return (state.instructions ?? [])
    .filter((item) => item.status === "pending" && (!bot || !item.botKey || item.botKey === bot))
    .map((item) => ({
      key: item.key,
      bot: item.botKey,
      task: item.taskKey,
      kind: item.kind,
      body: item.body,
      options: item.options,
      answer: item.answer,
    }));
}

function taskViewFromRow(task: TaskRow) {
  return {
    key: task.key,
    title: task.title,
    status: task.status,
    ownerBotKey: task.ownerBotKey,
    ownerLabel: task.ownerLabel,
    org: task.org,
    conflict: task.conflict,
    urgency: task.urgency,
    needsHuman: task.needsHuman === true,
    question: task.question ?? "",
    options: task.options ?? [],
    progress: task.progress ?? [],
    decision: task.decision ?? "",
  };
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
  return {
    key: bot.key,
    name: bot.name,
    org: bot.org,
    status: bot.heartbeatStatus || bot.status,
    role: bot.role,
    heartbeatStatus: bot.heartbeatStatus,
    lastHeartbeatAt: bot.lastHeartbeatAt,
    currentTask: bot.currentTask,
  };
}

function publicTask(task: ReturnType<typeof taskViewFromRow> | ReturnType<typeof rowsToView>["tasks"][number]) {
  const needsHuman = "needsHuman" in task ? task.needsHuman === true : false;
  return {
    key: task.key,
    title: task.title,
    status: task.status,
    owner: task.ownerBotKey ?? "",
    ownerLabel: task.ownerLabel,
    org: task.org,
    conflict: task.conflict,
    urgency: task.urgency,
    column: boardColumn({ status: task.status, needsHuman }),
    needsHuman,
    question: "question" in task ? task.question : "",
    options: "options" in task ? task.options : [],
    progress: "progress" in task ? task.progress : [],
    decision: "decision" in task ? task.decision : "",
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

function boolArg(args: Record<string, unknown>, key: string): boolean {
  const value = args[key];
  return value === true || value === "true";
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
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
    {
      name: "register_bot",
      description: "Register or update a bot in this workspace",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          org: { type: "string" },
          area: { type: "string" },
          wake: { type: "string" },
          routines: { type: "array", items: { type: "string" } },
        },
        required: ["name", "role"],
      },
    },
    {
      name: "heartbeat",
      description: "Record a bot status, current task, and last run",
      inputSchema: {
        type: "object",
        properties: {
          bot: { type: "string" },
          status: { type: "string" },
          current_task: { type: "string" },
          last_run: { type: "string" },
        },
        required: ["bot", "status"],
      },
    },
    {
      name: "create_task",
      description: "Create a task owned by a bot",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          owner: { type: "string" },
          org: { type: "string" },
          needs_human: { type: "boolean" },
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
        },
        required: ["title", "owner"],
      },
    },
    {
      name: "update_task",
      description: "Update a task title, status, or needs-human question",
      inputSchema: { type: "object", properties: { key: { type: "string" }, title: { type: "string" }, status: { type: "string" } }, required: ["key"] },
    },
    {
      name: "report_progress",
      description: "Append a progress note to a task",
      inputSchema: { type: "object", properties: { key: { type: "string" }, note: { type: "string" } }, required: ["key", "note"] },
    },
    {
      name: "complete_task",
      description: "Mark a task done",
      inputSchema: { type: "object", properties: { key: { type: "string" } }, required: ["key"] },
    },
    {
      name: "list_board",
      description: "List tasks in Backlog, Approved, In progress, Waiting on human, and Done",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_pending_instructions",
      description: "List instructions and decisions a bot has not acknowledged",
      inputSchema: { type: "object", properties: { bot: { type: "string" } } },
    },
    {
      name: "ack_instruction",
      description: "Acknowledge one instruction",
      inputSchema: { type: "object", properties: { key: { type: "string" } }, required: ["key"] },
    },
  ];
}

export function blankState(): FleetState {
  return emptyState();
}
