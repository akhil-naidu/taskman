import { encryptString, secretHint } from "./secrets";
import { stableHash } from "./text";
import type { BotRow, FleetState, RelayStatus, WebhookDelivery, WebhookEvent } from "./types";

export const DELIVERY_LIMIT = 200;
export const WEBHOOK_MAX_ATTEMPTS = 4;
export const WEBHOOK_BACKOFF_MS = [0, 30_000, 120_000, 600_000] as const;

export type WebhookUpdate = { botKey: string; url: string };

export type SealedWebhook = {
  botKey: string;
  ciphertext: string;
  iv: string;
  hint: string;
};

export type WebhookPayload = {
  event: WebhookEvent;
  taskKey: string;
  title: string;
  decision: string;
  boardUrl: string;
};

type WakeInput = {
  event: WebhookEvent;
  botKey: string;
  taskKey: string;
  title: string;
  decision: string;
  boardUrl: string;
};

export function isOrchestrator(role: string): boolean {
  return role.trim().toLowerCase() === "orchestrator";
}

export function boardUrlFromSite(siteUrl: string | undefined): string {
  const site = siteUrl?.trim().replace(/\/$/, "") ?? "";
  return site ? `${site}/board` : "/board";
}

export function parseWebhookUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.username || url.password || url.hash) return null;
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return null;
  return url.toString();
}

export async function sealWebhookUpdates(updates: WebhookUpdate[], material: string): Promise<SealedWebhook[]> {
  const sealed: SealedWebhook[] = [];
  for (const update of updates) {
    const encrypted = await encryptString(update.url, material);
    sealed.push({ botKey: update.botKey, ciphertext: encrypted.ciphertext, iv: encrypted.iv, hint: secretHint(update.url) });
  }
  return sealed;
}

export function webhookPayload(delivery: WebhookDelivery): WebhookPayload {
  return {
    event: delivery.event,
    taskKey: delivery.taskKey,
    title: delivery.title,
    decision: delivery.decision,
    boardUrl: delivery.boardUrl,
  };
}

export function newPendingKeys(before: FleetState, after: FleetState): string[] {
  const prior = new Set((before.deliveries ?? []).map((item) => item.key));
  return (after.deliveries ?? []).filter((item) => item.status === "pending" && !prior.has(item.key)).map((item) => item.key);
}

export function wakeForDecision(before: FleetState, after: FleetState, boardUrl: string, now: number): FleetState {
  let state = after;
  for (const task of after.tasks) {
    const previous = before.tasks.find((item) => item.key === task.key);
    if (!previous || !task.decision || task.decision === (previous.decision ?? "")) continue;
    state = enqueueDelivery(
      state,
      { event: "decision_recorded", botKey: task.ownerBotKey, taskKey: task.key, title: task.title, decision: task.decision, boardUrl },
      now,
    );
  }
  return state;
}

export function wakeForApproval(before: FleetState, after: FleetState, boardUrl: string, now: number): FleetState {
  let state = after;
  for (const task of after.tasks) {
    const previous = before.tasks.find((item) => item.key === task.key);
    if (!previous || task.status !== "approved" || previous.status === "approved") continue;
    state = enqueueDelivery(
      state,
      {
        event: "task_approved",
        botKey: task.ownerBotKey,
        taskKey: task.key,
        title: task.title,
        decision: task.decision ?? "",
        boardUrl,
      },
      now,
    );
  }
  return state;
}

export function wakeForInstruction(before: FleetState, after: FleetState, boardUrl: string, now: number): FleetState {
  const prior = new Set((before.instructions ?? []).map((item) => item.key));
  let state = after;
  for (const item of after.instructions ?? []) {
    if (prior.has(item.key) || item.kind !== "instruction") continue;
    const task = item.taskKey ? state.tasks.find((row) => row.key === item.taskKey) : undefined;
    state = enqueueDelivery(
      state,
      {
        event: "instruction_added",
        botKey: item.botKey || task?.ownerBotKey || "",
        taskKey: item.taskKey,
        title: task?.title || item.body,
        decision: item.answer,
        boardUrl,
      },
      now,
    );
  }
  return state;
}

export function enqueueDelivery(state: FleetState, input: WakeInput, now: number): FleetState {
  if (!input.botKey) return state;
  const bot = state.bots.find((item) => item.key === input.botKey);
  if (!bot?.webhookConfigured) return state;
  if ((state.deliveries ?? []).length >= DELIVERY_LIMIT) return state;
  const delivery: WebhookDelivery = {
    key: `delivery:${stableHash(`${input.botKey}|${input.event}|${input.taskKey}|${input.decision}|${now}`)}`,
    botKey: input.botKey,
    event: input.event,
    taskKey: input.taskKey,
    title: input.title.slice(0, 500),
    decision: input.decision.slice(0, 500),
    boardUrl: input.boardUrl.slice(0, 500),
    status: "pending",
    attempts: 0,
    lastError: "",
    createdAt: now,
    updatedAt: now,
    deliveredAt: 0,
    relayedAt: 0,
  };
  return { ...state, deliveries: [...(state.deliveries ?? []), delivery] };
}

export function applyDeliveryAttempt(
  state: FleetState,
  deliveryKey: string,
  outcome: { ok: boolean; error: string },
  now: number,
): { state: FleetState; retryInMs: number | null } {
  const delivery = (state.deliveries ?? []).find((item) => item.key === deliveryKey);
  if (!delivery || delivery.status !== "pending") return { state, retryInMs: null };
  const attempts = delivery.attempts + 1;
  const error = outcome.error.slice(0, 200);
  if (outcome.ok) {
    return {
      state: paintDelivery(state, { ...delivery, status: "delivered", attempts, lastError: "", updatedAt: now, deliveredAt: now }, now, {
        relayStatus: "delivered",
        webhookLastDeliveryAt: now,
        webhookLastError: "",
      }),
      retryInMs: null,
    };
  }
  if (attempts >= WEBHOOK_MAX_ATTEMPTS) {
    return {
      state: paintDelivery(state, { ...delivery, status: "undelivered", attempts, lastError: error, updatedAt: now }, now, {
        relayStatus: "undelivered",
        webhookLastError: error,
      }),
      retryInMs: null,
    };
  }
  const retryInMs = WEBHOOK_BACKOFF_MS[attempts] ?? WEBHOOK_BACKOFF_MS[WEBHOOK_BACKOFF_MS.length - 1];
  return {
    state: paintDelivery(state, { ...delivery, attempts, lastError: error, updatedAt: now }, now, {
      relayStatus: "retrying",
      webhookLastError: error,
    }),
    retryInMs,
  };
}

export function listUndelivered(state: FleetState) {
  return {
    deliveries: (state.deliveries ?? [])
      .filter((item) => item.status === "undelivered")
      .sort((a, b) => a.createdAt - b.createdAt || (a.key < b.key ? -1 : 1))
      .map((item) => ({
        key: item.key,
        bot: item.botKey,
        event: item.event,
        taskKey: item.taskKey,
        title: item.title,
        decision: item.decision,
        boardUrl: item.boardUrl,
        attempts: item.attempts,
        lastError: item.lastError,
      })),
  };
}

export function markRelayed(state: FleetState, key: string, now: number): { state: FleetState; error?: string } {
  const delivery = (state.deliveries ?? []).find((item) => item.key === key);
  if (!delivery) return { state, error: "Delivery was not found" };
  if (delivery.status === "relayed") return { state };
  if (delivery.status !== "undelivered") return { state, error: "Delivery is not waiting for relay" };
  const stillWaiting = (state.deliveries ?? []).some((item) => item.key !== key && item.botKey === delivery.botKey && item.status === "undelivered");
  return {
    state: paintDelivery(state, { ...delivery, status: "relayed", relayedAt: now, updatedAt: now }, now, {
      relayStatus: stillWaiting ? "undelivered" : "relayed",
    }),
  };
}

export type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number }>;

export async function postWebhook(url: string, body: WebhookPayload, fetchImpl: FetchLike): Promise<{ ok: boolean; error: string }> {
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return { ok: true, error: "" };
    return { ok: false, error: `HTTP ${response.status}` };
  } catch {
    return { ok: false, error: "Request failed" };
  }
}

function paintDelivery(
  state: FleetState,
  delivery: WebhookDelivery,
  now: number,
  health: { relayStatus: RelayStatus; webhookLastDeliveryAt?: number; webhookLastError?: string },
): FleetState {
  const deliveries = (state.deliveries ?? []).map((item) => (item.key === delivery.key ? delivery : item));
  const bots = state.bots.map((bot) => (bot.key === delivery.botKey ? applyHealth(bot, health, now) : bot));
  return { ...state, deliveries, bots };
}

function applyHealth(
  bot: BotRow,
  health: { relayStatus: RelayStatus; webhookLastDeliveryAt?: number; webhookLastError?: string },
  now: number,
): BotRow {
  return {
    ...bot,
    relayStatus: health.relayStatus,
    ...(health.webhookLastDeliveryAt !== undefined ? { webhookLastDeliveryAt: health.webhookLastDeliveryAt } : {}),
    ...(health.webhookLastError !== undefined ? { webhookLastError: health.webhookLastError } : {}),
    updatedAt: now,
  };
}
