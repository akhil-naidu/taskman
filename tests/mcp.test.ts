import { describe, expect, it } from "vitest";
import { answerDecision } from "../convex/model/decisions";
import { handleMcpMessage, mcpHttpBody, originAllowed, protocolVersionAllowed } from "../convex/model/mcp";
import { emptyState, planSnapshot } from "../convex/model/store";
import type { BotRow, FleetSnapshot, FleetState, TaskRow } from "../convex/model/types";

function bot(key: string, name: string, org: string): BotRow {
  return {
    key,
    name,
    description: "",
    role: "worker",
    org,
    orgColor: "#888888",
    avatarColor: "gray",
    avatarShape: "circle",
    wake: "daily",
    lastRunText: "",
    openCount: 0,
    openItems: [],
    activity: [],
    notes: [],
    updatedAt: 1,
  };
}

function task(partial: Partial<TaskRow> & Pick<TaskRow, "key">): TaskRow {
  return {
    title: partial.key,
    status: "todo",
    ownerBotKey: "",
    ownerLabel: "",
    org: "fleet",
    orgColor: "#888888",
    urgency: "normal",
    claimKey: partial.key,
    conflict: false,
    claimantKeys: [],
    sourceKey: "",
    externalId: "",
    externalUrl: "",
    addedDate: "",
    updatedAt: 1,
    ...partial,
  };
}

function fleet(bots: BotRow[], tasks: TaskRow[] = []): FleetState {
  return { ...emptyState(), bots, tasks };
}

const read = { canWrite: false };
const write = { canWrite: true };

function call(name: string, args: object, token: { canWrite: boolean } | null, state: FleetState) {
  return handleMcpMessage(
    { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } },
    token,
    state,
    10,
  );
}

function payload(outcome: ReturnType<typeof handleMcpMessage>) {
  const result = outcome.body?.result as { content?: { text: string }[]; isError?: boolean } | undefined;
  const text = result?.content?.[0]?.text ?? "";
  return { text, isError: result?.isError === true, data: text.startsWith("{") || text.startsWith("[") ? JSON.parse(text) : text };
}

function structured(outcome: ReturnType<typeof handleMcpMessage>) {
  return (outcome.body?.result as { structuredContent?: unknown } | undefined)?.structuredContent;
}

describe("mcp", () => {
  const workspaceA = fleet(
    [bot("bot-a", "Bot A", "fleet")],
    [task({ key: "task-1", title: "Hold the lane", ownerBotKey: "bot-a", ownerLabel: "Bot A", org: "fleet", status: "waiting" })],
  );
  const workspaceB = fleet([bot("bot-b", "Bot B", "personal")]);

  it("rejects a missing or revoked token before a tool runs", () => {
    const missing = call("list_bots", {}, null, workspaceA);
    expect(missing.httpStatus).toBe(401);
    expect(missing.body?.error?.message).toBe("unauthorized");
    expect(missing.nextState).toBeNull();
  });

  it("lists only the token workspace", () => {
    const listed = payload(call("list_bots", { workspaceId: "other" }, read, workspaceA));
    expect(listed.data.bots.map((item: { key: string }) => item.key)).toEqual(["bot-a"]);
    const other = payload(call("list_bots", {}, read, workspaceB));
    expect(other.data.bots.map((item: { key: string }) => item.key)).toEqual(["bot-b"]);
  });

  it("filters tasks and reports an unknown bot", () => {
    const tasks = payload(call("list_tasks", { org: "fleet", owner: "bot-a", status: "waiting" }, read, workspaceA));
    expect(tasks.data.tasks).toHaveLength(1);
    expect(tasks.data.tasks[0].owner).toBe("bot-a");
    const missed = payload(call("get_bot", { key: "missing" }, read, workspaceA));
    expect(missed.text).toBe("Bot was not found");
  });

  it("rejects a read token that claims a task", () => {
    const claimed = call("claim_task", { key: "task-1", owner: "bot-b" }, read, workspaceA);
    expect(claimed.httpStatus).toBe(403);
    expect(claimed.nextState).toBeNull();
    expect(workspaceA.tasks[0]?.ownerBotKey).toBe("bot-a");
  });

  it("keeps the current owner when another bot claims the task", () => {
    const both = fleet(
      [bot("bot-a", "Bot A", "fleet"), bot("bot-b", "Bot B", "fleet")],
      [task({ key: "task-1", ownerBotKey: "bot-a", ownerLabel: "Bot A" })],
    );
    const claimed = call("claim_task", { key: "task-1", owner: "bot-b" }, write, both);
    expect(payload(claimed).data.conflict).toBe(true);
    expect(claimed.nextState?.tasks[0]?.ownerBotKey).toBe("bot-a");
    expect(claimed.nextState?.tasks[0]?.conflict).toBe(true);
    const conflicts = payload(call("list_conflicts", {}, read, claimed.nextState ?? both));
    expect(conflicts.data.tasks.map((item: { key: string }) => item.key)).toEqual(["task-1"]);
  });

  it("assigns an unowned task and updates status without dropping fields", () => {
    const open = fleet([bot("bot-a", "Bot A", "fleet")], [task({ key: "task-2", org: "fleet" })]);
    const claimed = call("claim_task", { key: "task-2", owner: "bot-a" }, write, open);
    expect(claimed.nextState?.tasks[0]?.ownerBotKey).toBe("bot-a");
    const updated = call("update_task_status", { key: "task-2", status: "done" }, write, claimed.nextState ?? open);
    expect(updated.nextState?.tasks[0]?.status).toBe("done");
    expect(updated.nextState?.tasks[0]?.ownerBotKey).toBe("bot-a");
    expect(updated.nextState?.tasks[0]?.org).toBe("fleet");
  });

  it("reports one bot status and leaves the other bot in place", () => {
    const pair = fleet([bot("bot-a", "Bot A", "fleet"), bot("bot-b", "Bot B", "fleet")]);
    const denied = call("report_bot_status", { key: "bot-a", status: "active" }, read, pair);
    expect(denied.httpStatus).toBe(403);
    expect(denied.nextState).toBeNull();
    const reported = call("report_bot_status", { key: "bot-a", status: "active" }, write, pair);
    expect(reported.nextState?.bots).toHaveLength(2);
    expect(reported.nextState?.bots.find((item) => item.key === "bot-a")?.reportedStatus).toBe("active");
    expect(reported.nextState?.bots.find((item) => item.key === "bot-b")?.reportedStatus).toBeUndefined();
  });

  it("answers initialize as JSON or one SSE message and ignores notifications", () => {
    const message = { jsonrpc: "2.0", id: 7, method: "initialize", params: {} };
    const outcome = handleMcpMessage(message, null, emptyState());
    expect(outcome.body?.result).toMatchObject({ protocolVersion: "2025-06-18" });
    const json = mcpHttpBody("application/json, text/event-stream", outcome);
    expect(json.contentType).toBe("application/json");
    const sse = mcpHttpBody("text/event-stream", outcome);
    expect(sse.contentType).toBe("text/event-stream");
    expect(sse.body).toContain("event: message");
    const note = handleMcpMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, null, emptyState());
    expect(note.httpStatus).toBe(202);
    expect(note.body).toBeNull();
  });

  it("registers bot-a, records a heartbeat, and files a needs-human task", () => {
    const registered = call("register_bot", { name: "bot-a", role: "worker", org: "fleet", wake: "daily", routines: ["sweep"] }, write, emptyState());
    expect(registered.nextState?.bots.map((item) => item.key)).toEqual(["bot-a"]);
    expect(registered.nextState?.routines.map((item) => item.name)).toEqual(["sweep"]);
    const again = call("register_bot", { name: "bot-a", role: "editor", org: "fleet", wake: "daily", routines: ["sweep"] }, write, registered.nextState ?? emptyState());
    expect(again.nextState?.bots).toHaveLength(1);
    expect(again.nextState?.bots[0]?.role).toBe("editor");
    const beat = call("heartbeat", { bot: "bot-a", status: "awake", current_task: "task-9", last_run: "09:00 IST" }, write, again.nextState ?? emptyState());
    expect(beat.nextState?.bots[0]?.heartbeatStatus).toBe("awake");
    expect(beat.nextState?.bots[0]?.lastRunText).toBe("09:00 IST");
    const created = call(
      "create_task",
      { title: "Pick a lane", owner: "bot-a", needs_human: true, question: "Which lane?", options: ["left", "right"] },
      write,
      beat.nextState ?? emptyState(),
    );
    const task = created.nextState?.tasks[0];
    expect(task?.needsHuman).toBe(true);
    expect(task?.question).toBe("Which lane?");
    expect(task?.options).toEqual(["left", "right"]);
    const board = payload(call("list_board", {}, read, created.nextState ?? emptyState()));
    expect(board.data.waiting_human).toHaveLength(1);
    expect(board.data.backlog).toHaveLength(0);
    const denied = call("register_bot", { name: "bot-b", role: "worker" }, read, created.nextState ?? emptyState());
    expect(denied.httpStatus).toBe(403);
    expect(denied.nextState).toBeNull();
  });

  it("stores an onboarding profile on bot-a and imports tasks without duplicates", () => {
    const registered = call(
      "register_bot",
      {
        name: "bot-a",
        role: "worker",
        description: "Keeps the lane",
        routines: ["sweep"],
        open_work: ["Hold the lane"],
        waiting_on_human: ["Pick a color"],
        memories: ["Prefer short notes"],
      },
      write,
      emptyState(),
    );
    const botRow = registered.nextState?.bots[0];
    expect(botRow?.description).toBe("Keeps the lane");
    expect(botRow?.openItems).toEqual(["Hold the lane"]);
    expect(botRow?.notes).toEqual(["memory: Prefer short notes", "waiting: Pick a color"]);
    expect(registered.nextState?.bots).toHaveLength(1);
    const renamed = call("register_bot", { name: "bot-a", role: "editor" }, write, registered.nextState ?? emptyState());
    expect(renamed.nextState?.bots).toHaveLength(1);
    expect(renamed.nextState?.bots[0]?.role).toBe("editor");
    expect(renamed.nextState?.bots[0]?.description).toBe("Keeps the lane");
    const imported = call(
      "bulk_import_tasks",
      {
        tasks: [
          { title: "Hold the lane", owner: "bot-a", status: "backlog" },
          { title: "Write the note", owner: "bot-a", status: "In progress", org: "fleet" },
          { title: "Missing owner", owner: "bot-b", status: "backlog" },
        ],
      },
      write,
      renamed.nextState ?? emptyState(),
    );
    expect(imported.nextState?.tasks).toHaveLength(2);
    expect(imported.nextState?.tasks.map((item) => item.ownerBotKey)).toEqual(["bot-a", "bot-a"]);
    expect(payload(imported).data.skipped).toEqual([{ title: "Missing owner", owner: "bot-b", reason: "Owner was skipped" }]);
    const again = call(
      "bulk_import_tasks",
      { tasks: [{ title: "Hold the lane", owner: "bot-a", status: "done" }] },
      write,
      imported.nextState ?? emptyState(),
    );
    expect(again.nextState?.tasks).toHaveLength(2);
    expect(again.nextState?.tasks.find((item) => item.title === "Hold the lane")?.status).toBe("done");
    const denied = call("bulk_import_tasks", { tasks: [{ title: "Nope", owner: "bot-a" }] }, read, again.nextState ?? emptyState());
    expect(denied.httpStatus).toBe(403);
    expect(denied.nextState).toBeNull();
    const full = fleet(
      [bot("bot-a", "Bot A", "fleet")],
      Array.from({ length: 500 }, (_, index) => task({ key: `filled-${index}` })),
    );
    const capped = call("bulk_import_tasks", { tasks: [{ title: "One more", owner: "bot-a", status: "backlog" }] }, write, full);
    expect(capped.nextState).toBeNull();
    expect(payload(capped).text).toBe("Task cap exceeded");
  });

  it("rejects bot-b when bot-a already owns the task and starts an approved claim", () => {
    const both = fleet(
      [bot("bot-a", "Bot A", "fleet"), bot("bot-b", "Bot B", "fleet")],
      [task({ key: "task-9", ownerBotKey: "bot-a", ownerLabel: "Bot A", status: "approved" })],
    );
    const conflict = call("claim_task", { key: "task-9", owner: "bot-b" }, write, both);
    expect(payload(conflict).data.conflict).toBe(true);
    expect(conflict.nextState?.tasks[0]?.ownerBotKey).toBe("bot-a");
    const open = fleet([bot("bot-a", "Bot A", "fleet")], [task({ key: "task-8", status: "approved" })]);
    const claimed = call("claim_task", { key: "task-8", owner: "bot-a" }, write, open);
    expect(claimed.nextState?.tasks[0]?.ownerBotKey).toBe("bot-a");
    expect(claimed.nextState?.tasks[0]?.status).toBe("in_progress");
  });

  it("returns a human answer once and drops it after ack", () => {
    const state = fleet([bot("bot-a", "Bot A", "fleet")], [task({ key: "task-3", ownerBotKey: "bot-a", ownerLabel: "Bot A", needsHuman: true, question: "Ship it?" })]);
    const answered = answerDecision(state, "task-3", "yes", 10);
    const pending = payload(call("get_pending_instructions", { bot: "bot-a" }, read, answered.state));
    expect(Array.isArray(structured(call("get_pending_instructions", { bot: "bot-a" }, read, answered.state)))).toBe(false);
    expect(pending.data.instructions).toHaveLength(1);
    expect(pending.data.instructions[0].answer).toBe("yes");
    const acked = call("ack_instruction", { key: pending.data.instructions[0].key }, write, answered.state);
    const later = payload(call("get_pending_instructions", { bot: "bot-a" }, read, acked.nextState ?? answered.state));
    expect(later.data.instructions).toHaveLength(0);
  });

  it("returns object structured content for every list tool", () => {
    const names = ["list_bots", "list_tasks", "list_waiting_on_owner", "list_conflicts", "list_board", "get_pending_instructions", "list_undelivered", "get_bot_setup_instructions"];
    for (const name of names) {
      const content = structured(call(name, { bot: "bot-a" }, read, workspaceA));
      expect(Array.isArray(content)).toBe(false);
      expect(content).toEqual(expect.any(Object));
    }
    const pending = structured(call("get_pending_instructions", { bot: "bot-a" }, read, workspaceA)) as { instructions: unknown };
    expect(Array.isArray(pending.instructions)).toBe(true);
  });

  it("checks origin and protocol version", () => {
    expect(originAllowed(null, undefined)).toBe(true);
    expect(originAllowed("https://evil.example", "http://localhost:3000")).toBe(false);
    expect(originAllowed("http://localhost:3000", undefined)).toBe(true);
    expect(protocolVersionAllowed("2025-06-18")).toBe(true);
    expect(protocolVersionAllowed("1999-01-01")).toBe(false);
  });

  it("keeps a reported status across ingest", () => {
    const existing = fleet([bot("bot-a", "Bot A", "fleet")]);
    existing.bots[0]!.reportedStatus = "active";
    const snapshot: FleetSnapshot = {
      generatedAt: 2,
      bots: [
        {
          key: "bot-a",
          name: "Bot A",
          description: "",
          role: "worker",
          org: "fleet",
          orgColor: "#888888",
          avatarColor: "gray",
          avatarShape: "circle",
          wake: "daily",
          routines: [],
          lastRun: "",
          activity: [],
          notes: [],
          open: [],
        },
      ],
      waiting: [],
      tasks: [],
    };
    const next = planSnapshot(existing, snapshot, { now: 2, replace: true });
    expect(next.bots[0]?.reportedStatus).toBe("active");
  });
});
