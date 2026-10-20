import { orgColor } from "./orgs";
import { claimKeyForTitle, stableHash } from "./text";
import type {
  BotRow,
  FleetSnapshot,
  FleetState,
  Provider,
  RemoteTask,
  RoutineRow,
  RunRow,
  SourceRow,
  SyncLinkRow,
  SyncProvider,
  TaskRow,
} from "./types";
import { PROVIDERS } from "./types";

function byKey<T extends { key: string }>(rows: T[]): T[] {
  return rows.slice().sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

export function emptyState(): FleetState {
  return { bots: [], routines: [], runs: [], tasks: [], sources: [], syncLinks: [], ingestRuns: [], instructions: [] };
}

function isProvider(value: string): value is Provider {
  return (PROVIDERS as readonly string[]).includes(value);
}

export function recomputeConflicts(tasks: TaskRow[]): TaskRow[] {
  const groups = new Map<string, Set<string>>();
  for (const task of tasks) {
    const claimants = groups.get(task.claimKey) ?? new Set<string>();
    for (const key of task.claimantKeys) if (key) claimants.add(key);
    if (task.ownerBotKey) claimants.add(task.ownerBotKey);
    groups.set(task.claimKey, claimants);
  }
  return tasks.map((task) => {
    const claimants = [...(groups.get(task.claimKey) ?? [])].sort();
    return {
      ...task,
      claimantKeys: claimants.length > 0 ? claimants : task.claimantKeys,
      conflict: claimants.length > 1,
    };
  });
}

function finish(state: FleetState): FleetState {
  return {
    bots: byKey(state.bots),
    routines: byKey(state.routines),
    runs: byKey(state.runs),
    tasks: byKey(recomputeConflicts(state.tasks)),
    sources: byKey(state.sources),
    syncLinks: byKey(state.syncLinks),
    ingestRuns: byKey(state.ingestRuns),
    instructions: byKey(state.instructions ?? []),
  };
}

function providerName(provider: SyncProvider): string {
  if (provider === "clickup") return "ClickUp";
  if (provider === "github") return "GitHub Issues";
  if (provider === "linear") return "Linear";
  return "Jira";
}

function startedAtFromSummary(summary: string, now: number): number {
  const match = summary.match(/20\d\d-\d\d-\d\d/);
  if (!match) return now;
  const parsed = Date.parse(`${match[0]}T00:00:00+05:30`);
  return Number.isNaN(parsed) ? now : parsed;
}

export function planSnapshot(
  existing: FleetState,
  snapshot: FleetSnapshot,
  options: { now: number; replace?: boolean },
): FleetState {
  const replace = options.replace !== false;
  const now = options.now;
  const nameToKey = new Map<string, string>();
  for (const bot of snapshot.bots) {
    nameToKey.set(bot.key, bot.key);
    nameToKey.set(bot.name, bot.key);
  }
  const botByKey = new Map(snapshot.bots.map((bot) => [bot.key, bot]));

  const previousByKey = new Map(existing.bots.map((bot) => [bot.key, bot]));
  const bots: BotRow[] = snapshot.bots.map((bot) => {
    const previous = previousByKey.get(bot.key);
    return {
      key: bot.key,
      name: bot.name,
      description: bot.description,
      role: bot.role,
      org: bot.org,
      orgColor: bot.orgColor,
      avatarColor: bot.avatarColor,
      avatarShape: bot.avatarShape,
      wake: bot.wake,
      lastRunText: bot.lastRun,
      openCount: bot.open.length,
      openItems: [...bot.open],
      activity: [...bot.activity],
      notes: [...bot.notes],
      ...(previous?.reportedStatus ? { reportedStatus: previous.reportedStatus } : {}),
      ...(previous?.origin ? { origin: previous.origin } : {}),
      ...(previous?.heartbeatStatus ? { heartbeatStatus: previous.heartbeatStatus } : {}),
      ...(previous?.currentTaskKey ? { currentTaskKey: previous.currentTaskKey } : {}),
      ...(previous?.currentTaskText ? { currentTaskText: previous.currentTaskText } : {}),
      ...(previous?.lastHeartbeatAt ? { lastHeartbeatAt: previous.lastHeartbeatAt } : {}),
      updatedAt: now,
    };
  });
  const nextBotKeys = new Set(bots.map((bot) => bot.key));
  const preservedMcp = replace ? existing.bots.filter((bot) => bot.origin === "mcp" && !nextBotKeys.has(bot.key)) : existing.bots;
  const botMap = new Map(preservedMcp.map((bot) => [bot.key, bot]));
  for (const bot of bots) botMap.set(bot.key, bot);

  const routines: RoutineRow[] = [];
  for (const bot of snapshot.bots) {
    for (const name of bot.routines) {
      routines.push({ key: `${bot.key}:${name}`, botKey: bot.key, name, updatedAt: now });
    }
  }
  const mcpBotKeys = new Set([...previousByKey.values()].filter((bot) => bot.origin === "mcp").map((bot) => bot.key));
  const routineMap = new Map(
    (replace ? existing.routines.filter((routine) => mcpBotKeys.has(routine.botKey)) : existing.routines.filter((routine) => !nextBotKeys.has(routine.botKey))).map(
      (routine) => [routine.key, routine],
    ),
  );
  for (const routine of routines) routineMap.set(routine.key, routine);

  const runs: RunRow[] = [];
  for (const bot of snapshot.bots) {
    if (bot.lastRun && bot.lastRun !== "unknown") {
      runs.push({
        key: `${bot.key}:last`,
        botKey: bot.key,
        summary: bot.lastRun,
        status: "ok",
        startedAt: now,
        finishedAt: now,
        updatedAt: now,
      });
    }
    for (const summary of bot.activity) {
      const startedAt = startedAtFromSummary(summary, now);
      runs.push({
        key: `${bot.key}:note:${stableHash(summary)}`,
        botKey: bot.key,
        summary,
        status: "note",
        startedAt,
        finishedAt: startedAt,
        updatedAt: now,
      });
    }
  }
  const runMap = new Map((replace ? [] : existing.runs).map((run) => [run.key, run]));
  for (const run of runs) runMap.set(run.key, run);

  const fleetTasks: TaskRow[] = snapshot.waiting.map((item) => {
    const ownerBotKey = nameToKey.get(item.owner) ?? "";
    const owner = ownerBotKey ? botByKey.get(ownerBotKey) : undefined;
    return {
      key: `fleet:${stableHash(`${item.clusterId}|${item.owner}`)}`,
      title: item.title,
      status: "waiting",
      ownerBotKey,
      ownerLabel: item.owner,
      org: owner?.org ?? "unknown",
      orgColor: owner?.orgColor ?? orgColor("unknown"),
      urgency: item.urgency,
      claimKey: item.clusterId,
      conflict: item.conflict,
      claimantKeys: [...item.claimantKeys],
      sourceKey: "fleet",
      externalId: "",
      externalUrl: "",
      addedDate: item.date,
      updatedAt: now,
    };
  });

  const extras: TaskRow[] = snapshot.tasks.map((task) => {
    const ownerBotKey = nameToKey.get(task.owner) ?? "";
    const owner = ownerBotKey ? botByKey.get(ownerBotKey) : undefined;
    const org = task.org || owner?.org || "unknown";
    const claimants = task.claimants.length > 0 ? task.claimants : ownerBotKey ? [ownerBotKey] : [];
    return {
      key: task.key,
      title: task.title,
      status: task.status,
      ownerBotKey,
      ownerLabel: task.owner || "unassigned",
      org,
      orgColor: orgColor(org),
      urgency: task.urgency,
      claimKey: claimKeyForTitle(task.title),
      conflict: claimants.length > 1,
      claimantKeys: claimants,
      sourceKey: task.source || "fleet",
      externalId: task.externalId,
      externalUrl: task.url,
      addedDate: "",
      updatedAt: now,
    };
  });

  const kept = replace ? existing.tasks.filter((task) => task.sourceKey !== "fleet") : existing.tasks;
  const taskMap = new Map(kept.map((task) => [task.key, task]));
  for (const task of [...fleetTasks, ...extras]) taskMap.set(task.key, task);

  const sourceMap = new Map<string, SourceRow>(existing.sources.map((source) => [source.key, source]));
  sourceMap.set("fleet", {
    key: "fleet",
    provider: "fleet",
    name: "Fleet ingest",
    readOnly: true,
    updatedAt: now,
  });
  for (const task of extras) {
    if (task.sourceKey === "fleet" || sourceMap.has(task.sourceKey) || !isProvider(task.sourceKey)) continue;
    sourceMap.set(task.sourceKey, {
      key: task.sourceKey,
      provider: task.sourceKey,
      name: providerName(task.sourceKey as SyncProvider),
      readOnly: true,
      updatedAt: now,
    });
  }

  const linkMap = new Map<string, SyncLinkRow>(existing.syncLinks.map((link) => [link.key, link]));
  for (const task of extras) {
    if (!task.externalId || task.sourceKey === "fleet") continue;
    const key = `${task.sourceKey}:${task.externalId}`;
    linkMap.set(key, {
      key,
      sourceKey: task.sourceKey,
      externalId: task.externalId,
      taskKey: task.key,
      url: task.externalUrl,
      lastSyncedAt: now,
    });
  }

  return finish({
    bots: [...botMap.values()],
    routines: [...routineMap.values()],
    runs: [...runMap.values()],
    tasks: [...taskMap.values()],
    sources: [...sourceMap.values()],
    syncLinks: [...linkMap.values()],
    ingestRuns: [
      {
        key: "latest",
        receivedAt: now,
        botCount: botMap.size,
        taskCount: taskMap.size,
        status: "ok",
        message: "",
      },
    ],
    instructions: existing.instructions,
  });
}

export function planRemoteTasks(
  existing: FleetState,
  input: { provider: SyncProvider; tasks: RemoteTask[] },
  options: { now: number },
): FleetState {
  const now = options.now;
  const sourceMap = new Map(existing.sources.map((source) => [source.key, source]));
  sourceMap.set(input.provider, {
    key: input.provider,
    provider: input.provider,
    name: providerName(input.provider),
    readOnly: true,
    updatedAt: now,
  });
  const taskMap = new Map(existing.tasks.map((task) => [task.key, task]));
  const linkMap = new Map(existing.syncLinks.map((link) => [link.key, link]));
  for (const remote of input.tasks) {
    if (!remote.externalId || !remote.title) continue;
    const key = `${input.provider}:${remote.externalId}`;
    const ownerBotKey = remote.ownerBotKey ?? "";
    const org = remote.org || "unknown";
    taskMap.set(key, {
      key,
      title: remote.title,
      status: remote.status,
      ownerBotKey,
      ownerLabel: remote.ownerLabel || "unassigned",
      org,
      orgColor: orgColor(org),
      urgency: remote.urgency ?? "normal",
      claimKey: claimKeyForTitle(remote.title),
      conflict: false,
      claimantKeys: ownerBotKey ? [ownerBotKey] : [],
      sourceKey: input.provider,
      externalId: remote.externalId,
      externalUrl: remote.url ?? "",
      addedDate: "",
      updatedAt: now,
    });
    linkMap.set(key, {
      key,
      sourceKey: input.provider,
      externalId: remote.externalId,
      taskKey: key,
      url: remote.url ?? "",
      lastSyncedAt: now,
    });
  }
  return finish({
    ...existing,
    tasks: [...taskMap.values()],
    sources: [...sourceMap.values()],
    syncLinks: [...linkMap.values()],
  });
}
