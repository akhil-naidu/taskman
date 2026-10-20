import { describe, expect, it } from "vitest";
import { answerDecision, approveTask, queueInstruction } from "../convex/model/decisions";
import { handleMcpMessage } from "../convex/model/mcp";
import { decryptString } from "../convex/model/secrets";
import { emptyState } from "../convex/model/store";
import type { BotRow, FleetState, TaskRow, WebhookDelivery } from "../convex/model/types";
import {
  WEBHOOK_BACKOFF_MS,
  WEBHOOK_MAX_ATTEMPTS,
  applyDeliveryAttempt,
  listUndelivered,
  markRelayed,
  parseWebhookUrl,
  postWebhook,
  sealWebhookUpdates,
  wakeForApproval,
  wakeForDecision,
  wakeForInstruction,
  webhookPayload,
} from "../convex/model/webhooks";

const key = Buffer.from(new Uint8Array(32).map((_, index) => index + 1)).toString("base64");
const boardUrl = "https://taskman.example/board";
const webhookUrl = "https://hooks.example/bot-a";

function bot(partial: Partial<BotRow> & Pick<BotRow, "key" | "name">): BotRow {
  return {
    description: "",
    role: "worker",
    org: "fleet",
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
    ...partial,
  };
}

function task(partial: Partial<TaskRow> & Pick<TaskRow, "key">): TaskRow {
  return {
    title: partial.key,
    status: "backlog",
    ownerBotKey: "bot-a",
    ownerLabel: "bot-a",
    org: "fleet",
    orgColor: "#888888",
    urgency: "normal",
    claimKey: partial.key,
    conflict: false,
    claimantKeys: ["bot-a"],
    sourceKey: "",
    externalId: "",
    externalUrl: "",
    addedDate: "",
    updatedAt: 1,
    ...partial,
  };
}

function state(): FleetState {
  return {
    ...emptyState(),
    bots: [bot({ key: "bot-a", name: "bot-a", webhookConfigured: true }), bot({ key: "bot-b", name: "bot-b" })],
    tasks: [task({ key: "task-1", title: "Hold the lane", needsHuman: true, question: "Ship it?" })],
  };
}

function call(name: string, args: object, canWrite: boolean, current: FleetState) {
  return handleMcpMessage({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }, { canWrite }, current, 10);
}

function structured(outcome: ReturnType<typeof handleMcpMessage>) {
  return (outcome.body?.result as { structuredContent?: unknown } | undefined)?.structuredContent;
}

describe("webhook dispatch", () => {
  it("encrypts a webhook url and keeps it out of fleet state", async () => {
    const registered = call("register_bot", { name: "bot-a", role: "worker", webhook_url: webhookUrl }, true, emptyState());
    expect(registered.webhookUpdates).toEqual([{ botKey: "bot-a", url: webhookUrl }]);
    expect(JSON.stringify(registered.nextState)).not.toContain(webhookUrl);
    expect(JSON.stringify(registered.body)).not.toContain(webhookUrl);
    expect(registered.nextState?.bots[0]?.webhookConfigured).toBe(true);
    const [sealed] = await sealWebhookUpdates(registered.webhookUpdates, key);
    expect(sealed?.ciphertext).not.toContain(webhookUrl);
    expect(await decryptString(sealed!.ciphertext, sealed!.iv, key)).toBe(webhookUrl);
    const denied = call("set_bot_webhook", { bot: "bot-a", url: webhookUrl }, false, registered.nextState ?? emptyState());
    expect(denied.httpStatus).toBe(403);
    expect(denied.webhookUpdates).toEqual([]);
  });

  it("rejects a webhook that is not https", () => {
    expect(parseWebhookUrl("http://hooks.example/bot-a")).toBeNull();
    expect(parseWebhookUrl("https://hooks.example/bot-a")).toBe("https://hooks.example/bot-a");
    const rejected = call("set_bot_webhook", { bot: "bot-a", url: "http://hooks.example/bot-a" }, true, state());
    expect(rejected.nextState).toBeNull();
    expect(rejected.webhookUpdates).toEqual([]);
  });

  it("posts a decision once and an approval separately", async () => {
    const current = state();
    const answered = answerDecision(current, "task-1", "yes", 10);
    const woken = wakeForDecision(current, answered.state, boardUrl, 10);
    expect(woken.deliveries).toHaveLength(1);
    expect(woken.deliveries[0]?.event).toBe("decision_recorded");
    expect(webhookPayload(woken.deliveries[0] as WebhookDelivery)).toEqual({
      event: "decision_recorded",
      taskKey: "task-1",
      title: "Hold the lane",
      decision: "yes",
      boardUrl,
    });
    const seen: unknown[] = [];
    const posted = await postWebhook(webhookUrl, webhookPayload(woken.deliveries[0] as WebhookDelivery), async (_url, init) => {
      seen.push(JSON.parse(init?.body ?? "{}"));
      return { ok: true, status: 204 };
    });
    expect(posted.ok).toBe(true);
    expect(seen).toEqual([webhookPayload(woken.deliveries[0] as WebhookDelivery)]);
    const delivered = applyDeliveryAttempt(woken, woken.deliveries[0]!.key, { ok: true, error: "" }, 11);
    expect(delivered.retryInMs).toBeNull();
    expect(delivered.state.deliveries[0]?.status).toBe("delivered");
    expect(delivered.state.bots.find((item) => item.key === "bot-a")?.webhookLastDeliveryAt).toBe(11);
    expect(delivered.state.bots.find((item) => item.key === "bot-a")?.webhookLastError).toBe("");

    const approved = approveTask(current, "task-1", 12);
    const approval = wakeForApproval(current, approved.state, boardUrl, 12);
    expect(approval.deliveries.map((item) => item.event)).toEqual(["task_approved"]);
    expect(wakeForApproval(approved.state, approved.state, boardUrl, 13).deliveries).toHaveLength(0);
    expect(wakeForDecision(current, answered.state, boardUrl, 10).deliveries.map((item) => item.event)).toEqual(["decision_recorded"]);
  });

  it("does not post a bot that has no webhook", () => {
    const current = state();
    current.tasks[0] = { ...current.tasks[0]!, ownerBotKey: "bot-b", ownerLabel: "bot-b" };
    const approved = approveTask(current, "task-1", 12);
    expect(wakeForApproval(current, approved.state, boardUrl, 12).deliveries).toHaveLength(0);
  });

  it("retries with backoff and then queues the delivery for relay", () => {
    const current = state();
    const approved = approveTask(current, "task-1", 12);
    let next = wakeForApproval(current, approved.state, boardUrl, 12);
    const deliveryKey = next.deliveries[0]!.key;
    const delays: Array<number | null> = [];
    for (let attempt = 0; attempt < WEBHOOK_MAX_ATTEMPTS; attempt += 1) {
      const applied = applyDeliveryAttempt(next, deliveryKey, { ok: false, error: "HTTP 500" }, 20 + attempt);
      delays.push(applied.retryInMs);
      next = applied.state;
    }
    expect(delays).toEqual([WEBHOOK_BACKOFF_MS[1], WEBHOOK_BACKOFF_MS[2], WEBHOOK_BACKOFF_MS[3], null]);
    expect(next.deliveries[0]?.status).toBe("undelivered");
    expect(next.bots.find((item) => item.key === "bot-a")?.relayStatus).toBe("undelivered");
    expect(next.bots.find((item) => item.key === "bot-a")?.webhookLastError).toBe("HTTP 500");
    const listed = call("list_undelivered", {}, false, next);
    expect(Array.isArray(structured(listed))).toBe(false);
    expect(listUndelivered(next).deliveries).toEqual([
      expect.objectContaining({ bot: "bot-a", event: "task_approved", taskKey: "task-1", decision: "", boardUrl }),
    ]);
    expect(JSON.stringify(listed.body)).not.toContain(webhookUrl);
    const relayed = call("mark_relayed", { key: deliveryKey }, true, next);
    expect(relayed.nextState?.deliveries[0]?.status).toBe("relayed");
    expect(listUndelivered(relayed.nextState ?? next).deliveries).toHaveLength(0);
    expect(relayed.nextState?.bots.find((item) => item.key === "bot-a")?.relayStatus).toBe("relayed");
    const denied = call("mark_relayed", { key: deliveryKey }, false, next);
    expect(denied.httpStatus).toBe(403);
    expect(markRelayed(next, deliveryKey, 30).state.deliveries[0]?.status).toBe("relayed");
  });

  it("wakes the named bot for an instruction and leaves an untargeted instruction unposted", () => {
    const current = state();
    const named = queueInstruction(current, { body: "Check the lane", botKey: "bot-a" }, 15);
    const woken = wakeForInstruction(current, named.state, boardUrl, 15);
    expect(woken.deliveries.map((item) => item.event)).toEqual(["instruction_added"]);
    expect(woken.deliveries[0]?.title).toBe("Check the lane");
    const open = queueInstruction(current, { body: "Anyone" }, 16);
    expect(wakeForInstruction(current, open.state, boardUrl, 16).deliveries).toHaveLength(0);
  });
});
