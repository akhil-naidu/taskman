import { istDateString } from "./clock";
import { orgColor, orgSlug, ORG_ORDER } from "./orgs";
import type { BotStatus, BotView, FleetState, FleetView, TaskRow, TaskView } from "./types";

export function deriveStatus(
  bot: { openCount: number; activity: string[] },
  routineCount: number,
  today: string,
): BotStatus {
  if (bot.openCount > 0) return "waiting";
  if (bot.activity.some((line) => line.includes(today))) return "active";
  if (routineCount > 0) return "routine";
  return "on-demand";
}

function taskView(task: TaskRow): TaskView {
  return {
    key: task.key,
    title: task.title,
    status: task.status,
    ...(task.ownerBotKey ? { ownerBotKey: task.ownerBotKey } : {}),
    ownerLabel: task.ownerLabel,
    org: task.org,
    orgColor: task.orgColor,
    urgency: task.urgency,
    conflict: task.conflict,
    claimants: task.claimantKeys,
    sourceKey: task.sourceKey,
    ...(task.externalUrl ? { externalUrl: task.externalUrl } : {}),
    ...(task.addedDate ? { addedDate: task.addedDate } : {}),
    needsHuman: task.needsHuman === true,
    question: task.question ?? "",
    options: task.options ?? [],
    progress: task.progress ?? [],
    decision: task.decision ?? "",
  };
}

export function rowsToView(state: FleetState, now: number, truncated = false): FleetView {
  const today = istDateString(now);
  const routinesByBot = new Map<string, string[]>();
  for (const routine of state.routines) {
    const names = routinesByBot.get(routine.botKey) ?? [];
    names.push(routine.name);
    routinesByBot.set(routine.botKey, names);
  }
  const tasks = state.tasks.map(taskView);
  const bots: BotView[] = state.bots.map((bot) => {
    const routines = routinesByBot.get(bot.key) ?? [];
    const inProgress = tasks.filter((task) => task.ownerBotKey === bot.key && task.status === "in_progress");
    const current = inProgress.find((task) => !task.conflict) ?? inProgress[0];
    return {
      key: bot.key,
      name: bot.name,
      org: bot.org,
      orgColor: bot.orgColor,
      avatarColor: bot.avatarColor,
      avatarShape: bot.avatarShape,
      role: bot.role,
      wake: bot.wake,
      routines,
      lastRun: bot.lastRunText,
      openCount: bot.openCount,
      openItems: bot.openItems,
      activity: bot.activity,
      notes: bot.notes,
      status: bot.reportedStatus ?? deriveStatus(bot, routines.length, today),
      currentWork: current?.title || bot.openItems[0] || "—",
      heartbeatStatus: bot.heartbeatStatus ?? "",
      lastHeartbeatAt: bot.lastHeartbeatAt ?? 0,
      currentTask: bot.currentTaskText || current?.title || "",
      webhookConfigured: bot.webhookConfigured === true,
      webhookLastDeliveryAt: bot.webhookLastDeliveryAt ?? 0,
      webhookLastError: bot.webhookLastError ?? "",
      relayStatus: bot.relayStatus ?? "",
    };
  });
  bots.sort((a, b) => (a.org < b.org ? -1 : a.org > b.org ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const waiting = tasks.filter((task) => task.status === "waiting");
  return {
    generatedAt: state.ingestRuns.find((run) => run.key === "latest")?.receivedAt ?? now,
    bots,
    tasks,
    instructions: (state.instructions ?? []).map((item) => ({
      key: item.key,
      botKey: item.botKey,
      taskKey: item.taskKey,
      kind: item.kind,
      body: item.body,
      answer: item.answer,
      status: item.status,
    })),
    relayWaiting: (state.deliveries ?? []).filter((item) => item.status === "undelivered").length,
    tiles: {
      bots: bots.length,
      orgs: new Set(bots.map((bot) => bot.org)).size,
      routines: state.routines.length,
      active: bots.filter((bot) => bot.status === "active").length,
      waiting: waiting.length,
      high: waiting.filter((task) => task.urgency === "high").length,
    },
    truncated,
  };
}

export function orgOptions(bots: { org: string; orgColor?: string }[]) {
  const counts = new Map<string, number>();
  for (const bot of bots) counts.set(bot.org, (counts.get(bot.org) ?? 0) + 1);
  const extras = [...counts.keys()].filter((name) => !(ORG_ORDER as readonly string[]).includes(name)).sort();
  const names = [...ORG_ORDER.filter((name) => counts.has(name)), ...extras];
  return names.map((name) => ({
    slug: orgSlug(name),
    name,
    color: bots.find((bot) => bot.org === name)?.orgColor || orgColor(name),
    count: counts.get(name) ?? 0,
  }));
}
