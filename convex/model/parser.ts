import { botKey, orgColor } from "./orgs";
import { claimKeyForTitle, normalizeTokens, tokenOverlap, urgencyFor } from "./text";
import type {
  FleetDocuments,
  FleetSnapshot,
  SnapshotBot,
  SnapshotTask,
  TaskStatus,
  WaitingItem,
} from "./types";
import { TASK_STATUSES } from "./types";

const DATE = /20\d\d-\d\d-\d\d/;

export function roleFromDescription(description: string, override?: string): string {
  if (override?.trim()) return override.trim().slice(0, 180);
  const match = description.match(/^\s*You are [^,]+,\s*(.+?)(?:\.\s|\n|$)/);
  let text = (match?.[1] ?? description.split("\n")[0] ?? "").trim();
  if (text && !text.startsWith("dFlow")) text = text[0]!.toUpperCase() + text.slice(1);
  return text.slice(0, 180) || "unknown";
}

export function wakeFromDescription(description: string): string {
  const match = description.match(/(?:WAKE|RECURRING):\s*([^\n]+)/);
  if (!match) return "unknown";
  const text = match[1]!.trim();
  if (!text) return "unknown";
  if (text.length > 110) return `${text.slice(0, 110)}…`;
  return text;
}

export function recentActivity(texts: string[], limit = 3): string[] {
  const rows: string[] = [];
  for (const text of texts) {
    for (const line of text.split(/\r?\n/)) {
      if (!DATE.test(line) || line.startsWith("|---")) continue;
      const cleaned = line
        .replace(/https?:\/\/\S+/g, "")
        .replace(/^[-|# ]+|[-|# ]+$/g, "")
        .replace(/\|/g, " · ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180);
      if (cleaned) rows.push(cleaned);
    }
  }
  return rows.slice(-limit);
}

export function openItemsFromNotes(text: string): string[] {
  const items: string[] = [];
  let inWaiting = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^##\s+Waiting on\b/i.test(line)) {
      inWaiting = true;
      continue;
    }
    if (inWaiting && line.trim() === "") {
      inWaiting = false;
      continue;
    }
    if (inWaiting && /^##\s+/.test(line)) inWaiting = false;
    const todo = line.match(/^- \[( |x)\]\s*(.*)$/);
    if (todo) {
      if (todo[1] === " ") items.push(todo[2]!.trim().slice(0, 160));
      continue;
    }
    if (inWaiting && line.trim()) {
      items.push(line.replace(/^[-*]\s*/, "").trim().slice(0, 160));
    }
  }
  return [...new Set(items.filter(Boolean))];
}

function pendingItems(text: string): { title: string; owner: string; date: string }[] {
  const items: { title: string; owner: string; date: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^- \[( |x)\]\s*(.*)$/);
    if (!match || match[1] !== " ") continue;
    const parts = match[2]!.split("|").map((part) => part.trim());
    const title = (parts[0] ?? "").slice(0, 500);
    if (!title) continue;
    items.push({ title, owner: parts[1] || "unassigned", date: parts[2] ?? "" });
  }
  return items;
}

type RawWaiting = {
  title: string;
  owner: string;
  date: string;
  source: string;
  tokens: Set<string>;
};

export function clusterWaiting(items: RawWaiting[]): WaitingItem[] {
  type Cluster = { tokens: Set<string>; items: WaitingItem[] };
  const clusters: Cluster[] = [];
  const waiting: WaitingItem[] = [];

  for (const item of items) {
    const urgency = urgencyFor(item.title);
    const cluster = clusters.find((candidate) => tokenOverlap(candidate.tokens, item.tokens));
    if (!cluster) {
      const created: WaitingItem = {
        title: item.title,
        owner: item.owner,
        date: item.date,
        source: item.source,
        urgency,
        conflict: false,
        claimantKeys: [item.owner],
        clusterId: claimKeyForTitle(item.title),
      };
      waiting.push(created);
      clusters.push({ tokens: item.tokens, items: [created] });
      continue;
    }
    if (cluster.items.some((existing) => existing.owner === item.owner)) {
      if (urgency === "high") for (const existing of cluster.items) existing.urgency = "high";
      continue;
    }
    const created: WaitingItem = {
      title: item.title,
      owner: item.owner,
      date: item.date,
      source: item.source,
      urgency,
      conflict: true,
      claimantKeys: [],
      clusterId: cluster.items[0]?.clusterId ?? claimKeyForTitle(item.title),
    };
    cluster.items.push(created);
    waiting.push(created);
    const owners = [...new Set(cluster.items.map((entry) => entry.owner))].sort();
    const high = cluster.items.some((entry) => entry.urgency === "high");
    for (const entry of cluster.items) {
      entry.conflict = owners.length > 1;
      entry.claimantKeys = owners;
      if (high) entry.urgency = "high";
    }
  }
  return waiting;
}

function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

function normalizeTask(task: Partial<SnapshotTask>, index: number): SnapshotTask {
  const key = task.key?.trim();
  const title = task.title?.trim();
  const status = task.status ?? "todo";
  if (!key || !title) throw new Error(`Task ${index + 1} needs a key and a title`);
  if (!isTaskStatus(status)) throw new Error(`Task ${key} has an unknown status`);
  return {
    key,
    title: title.slice(0, 500),
    status,
    owner: task.owner?.trim() ?? "",
    org: task.org?.trim() ?? "",
    urgency: task.urgency === "high" ? "high" : "normal",
    claimants: (task.claimants ?? []).map((claimant) => claimant.trim()).filter(Boolean),
    source: task.source?.trim() || "fleet",
    externalId: task.externalId?.trim() ?? "",
    url: task.url?.trim() ?? "",
  };
}

function wordBoundary(name: string, text: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(text);
}

export function parseFleetDocuments(docs: FleetDocuments, options: { now?: number } = {}): FleetSnapshot {
  const config = docs.config ?? {};
  const colours = config.org_colours ?? {};
  const seen = new Set<string>();
  const bots: SnapshotBot[] = [];

  const profiles = [...docs.profiles].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  for (const profile of profiles) {
    const name = profile.name?.trim();
    if (!name) continue;
    const key = botKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    const description = profile.description ?? "";
    const org = config.org_map?.[name] || "unknown";
    const notes = [...(config.notes?.[name] ?? [])];
    bots.push({
      key,
      name,
      description: description.slice(0, 2000),
      role: roleFromDescription(description, config.role_override?.[name]),
      org,
      orgColor: orgColor(org, colours),
      avatarColor: profile.avatarColor?.trim() || "unknown",
      avatarShape: profile.avatarShape?.trim() || "unknown",
      wake: wakeFromDescription(description),
      routines: [...(config.known_routines?.[name] ?? [])],
      lastRun: config.last_run?.[name]?.trim() || "unknown",
      activity: [],
      notes,
      open: [],
    });
  }

  for (const line of (docs.index ?? "").split(/\r?\n/)) {
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
    if (cells.length < 3 || !cells[0]?.endsWith(".md")) continue;
    const path = cells[0];
    if (!docs.files[path]) continue;
    for (const bot of bots) {
      if (!wordBoundary(bot.name, cells[2] ?? "")) continue;
      if (!bot.notes.includes(path)) bot.notes.push(path);
    }
  }

  for (const bot of bots) {
    const texts = bot.notes.map((path) => docs.files[path] ?? "").filter(Boolean);
    bot.activity = recentActivity(texts);
    const open: string[] = [];
    for (const text of texts) open.push(...openItemsFromNotes(text));
    bot.open = [...new Set(open)];
  }

  const raw: RawWaiting[] = [];
  for (const item of pendingItems(docs.pending ?? "")) {
    raw.push({ ...item, source: "pending.md", tokens: normalizeTokens(item.title) });
  }
  for (const bot of bots) {
    for (const title of bot.open) {
      raw.push({ title, owner: bot.name, date: "", source: "notes", tokens: normalizeTokens(title) });
    }
  }

  return {
    generatedAt: options.now ?? Date.now(),
    bots: bots.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
    waiting: clusterWaiting(raw),
    tasks: (docs.tasks ?? []).map((task, index) => normalizeTask(task, index)),
  };
}
