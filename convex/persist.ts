import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { DELIVERY_LIMIT } from "./model/webhooks";
import type { FleetState } from "./model/types";

type ReadCtx = Pick<QueryCtx, "db">;
type WorkspaceId = Id<"workspaces">;

export const LIMITS = {
  bots: 200,
  routines: 500,
  runs: 500,
  tasks: 500,
  sources: 50,
  syncLinks: 500,
  ingestRuns: 20,
  instructions: 200,
  deliveries: DELIVERY_LIMIT,
} as const;

function strip<T extends { _id: string; _creationTime: number; workspaceId: string }>(doc: T) {
  const { _id, _creationTime, workspaceId, ...rest } = doc;
  void _id;
  void _creationTime;
  void workspaceId;
  return rest;
}

function definedRow<T extends object>(row: T): T {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) next[key] = value;
  }
  return next as T;
}

function capped(length: number, limit: number, strict: boolean, table: string) {
  if (strict && length >= limit) throw new Error(`${table} exceeds the ingest limit`);
  return length >= limit;
}

async function replaceByKey<Id, Row extends { key: string }>(
  existing: Array<{ _id: Id; key: string }>,
  rows: Row[],
  ops: {
    remove: (id: Id) => Promise<void>;
    patch: (id: Id, row: Row) => Promise<void>;
    insert: (row: Row) => Promise<unknown>;
  },
) {
  const byKey = new Map(existing.map((row) => [row.key, row]));
  const nextKeys = new Set(rows.map((row) => row.key));
  for (const row of existing) {
    if (!nextKeys.has(row.key)) await ops.remove(row._id);
  }
  for (const row of rows) {
    const current = byKey.get(row.key);
    if (current) await ops.patch(current._id, row);
    else await ops.insert(row);
  }
}

export async function loadState(
  ctx: ReadCtx,
  workspaceId: WorkspaceId,
  strict = false,
): Promise<{ state: FleetState; truncated: boolean }> {
  const bots = await ctx.db
    .query("bots")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.bots);
  const routines = await ctx.db
    .query("routines")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.routines);
  const runs = await ctx.db
    .query("runs")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.runs);
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.tasks);
  const sources = await ctx.db
    .query("sources")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.sources);
  const syncLinks = await ctx.db
    .query("syncLinks")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.syncLinks);
  const ingestRuns = await ctx.db
    .query("ingestRuns")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.ingestRuns);
  const instructions = await ctx.db
    .query("instructions")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.instructions);
  const deliveries = await ctx.db
    .query("webhookDeliveries")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.deliveries);
  const truncated =
    capped(bots.length, LIMITS.bots, strict, "bots") ||
    capped(routines.length, LIMITS.routines, strict, "routines") ||
    capped(runs.length, LIMITS.runs, strict, "runs") ||
    capped(tasks.length, LIMITS.tasks, strict, "tasks") ||
    capped(sources.length, LIMITS.sources, strict, "sources") ||
    capped(syncLinks.length, LIMITS.syncLinks, strict, "syncLinks") ||
    capped(ingestRuns.length, LIMITS.ingestRuns, strict, "ingestRuns") ||
    capped(instructions.length, LIMITS.instructions, strict, "instructions") ||
    capped(deliveries.length, LIMITS.deliveries, strict, "deliveries");
  return {
    truncated,
    state: {
      bots: bots.map((doc) => strip(doc)),
      routines: routines.map((doc) => strip(doc)),
      runs: runs.map((doc) => strip(doc)),
      tasks: tasks.map((doc) => strip(doc)),
      sources: sources.map((doc) => strip(doc)),
      syncLinks: syncLinks.map((doc) => {
        const { taskId, ...link } = strip(doc);
        void taskId;
        return link;
      }),
      ingestRuns: ingestRuns.map((doc) => strip(doc)),
      instructions: instructions.map((doc) => strip(doc)),
      deliveries: deliveries.map((doc) => strip(doc)),
    },
  };
}

export async function writeState(ctx: MutationCtx, workspaceId: WorkspaceId, state: FleetState) {
  const bots = state.bots.map((row) => ({ ...definedRow(row), workspaceId }));
  const routines = state.routines.map((row) => ({ ...definedRow(row), workspaceId }));
  const runs = state.runs.map((row) => ({ ...definedRow(row), workspaceId }));
  const tasks = state.tasks.map((row) => ({ ...definedRow(row), workspaceId }));
  const sources = state.sources.map((row) => ({ ...definedRow(row), workspaceId }));
  const ingestRuns = state.ingestRuns.map((row) => ({ ...definedRow(row), workspaceId }));
  const instructions = (state.instructions ?? []).map((row) => ({ ...definedRow(row), workspaceId }));
  const deliveries = (state.deliveries ?? []).map((row) => ({ ...definedRow(row), workspaceId }));
  if (bots.length > LIMITS.bots) throw new Error("bots exceeds the ingest limit");
  if (routines.length > LIMITS.routines) throw new Error("routines exceeds the ingest limit");
  if (runs.length > LIMITS.runs) throw new Error("runs exceeds the ingest limit");
  if (tasks.length > LIMITS.tasks) throw new Error("tasks exceeds the ingest limit");
  if (sources.length > LIMITS.sources) throw new Error("sources exceeds the ingest limit");
  if (ingestRuns.length > LIMITS.ingestRuns) throw new Error("ingestRuns exceeds the ingest limit");
  if (state.syncLinks.length > LIMITS.syncLinks) throw new Error("syncLinks exceeds the ingest limit");
  if (instructions.length > LIMITS.instructions) throw new Error("instructions exceeds the ingest limit");
  if (deliveries.length > LIMITS.deliveries) throw new Error("deliveries exceeds the ingest limit");

  const existingBots = await ctx.db
    .query("bots")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.bots);
  const existingRoutines = await ctx.db
    .query("routines")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.routines);
  const existingRuns = await ctx.db
    .query("runs")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.runs);
  const existingTasks = await ctx.db
    .query("tasks")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.tasks);
  const existingSources = await ctx.db
    .query("sources")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.sources);
  const existingIngest = await ctx.db
    .query("ingestRuns")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.ingestRuns);
  const existingLinks = await ctx.db
    .query("syncLinks")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.syncLinks);
  const existingInstructions = await ctx.db
    .query("instructions")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.instructions);
  const existingDeliveries = await ctx.db
    .query("webhookDeliveries")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .take(LIMITS.deliveries);
  capped(existingBots.length, LIMITS.bots, true, "bots");
  capped(existingRoutines.length, LIMITS.routines, true, "routines");
  capped(existingRuns.length, LIMITS.runs, true, "runs");
  capped(existingTasks.length, LIMITS.tasks, true, "tasks");
  capped(existingSources.length, LIMITS.sources, true, "sources");
  capped(existingIngest.length, LIMITS.ingestRuns, true, "ingestRuns");
  capped(existingLinks.length, LIMITS.syncLinks, true, "syncLinks");
  capped(existingInstructions.length, LIMITS.instructions, true, "instructions");
  capped(existingDeliveries.length, LIMITS.deliveries, true, "deliveries");

  await replaceByKey(existingBots, bots, {
    remove: (id) => ctx.db.delete(id),
    patch: (id, row) => ctx.db.patch(id, row),
    insert: (row) => ctx.db.insert("bots", row),
  });
  await replaceByKey(existingRoutines, routines, {
    remove: (id) => ctx.db.delete(id),
    patch: (id, row) => ctx.db.patch(id, row),
    insert: (row) => ctx.db.insert("routines", row),
  });
  await replaceByKey(existingRuns, runs, {
    remove: (id) => ctx.db.delete(id),
    patch: (id, row) => ctx.db.patch(id, row),
    insert: (row) => ctx.db.insert("runs", row),
  });
  await replaceByKey(existingTasks, tasks, {
    remove: (id) => ctx.db.delete(id),
    patch: (id, row) => ctx.db.patch(id, row),
    insert: (row) => ctx.db.insert("tasks", row),
  });
  await replaceByKey(existingSources, sources, {
    remove: (id) => ctx.db.delete(id),
    patch: (id, row) => ctx.db.patch(id, row),
    insert: (row) => ctx.db.insert("sources", row),
  });
  await replaceByKey(existingIngest, ingestRuns, {
    remove: (id) => ctx.db.delete(id),
    patch: (id, row) => ctx.db.patch(id, row),
    insert: (row) => ctx.db.insert("ingestRuns", row),
  });
  await replaceByKey(existingInstructions, instructions, {
    remove: (id) => ctx.db.delete(id),
    patch: (id, row) => ctx.db.patch(id, row),
    insert: (row) => ctx.db.insert("instructions", row),
  });
  await replaceByKey(existingDeliveries, deliveries, {
    remove: (id) => ctx.db.delete(id),
    patch: (id, row) => ctx.db.patch(id, row),
    insert: (row) => ctx.db.insert("webhookDeliveries", row),
  });

  const links = [];
  for (const link of state.syncLinks) {
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_workspace_key", (q) => q.eq("workspaceId", workspaceId).eq("key", link.taskKey))
      .unique();
    if (!task) throw new Error(`Missing task for sync link ${link.key}`);
    links.push({ ...link, taskId: task._id, workspaceId });
  }
  await replaceByKey(existingLinks, links, {
    remove: (id) => ctx.db.delete(id),
    patch: (id, row) => ctx.db.patch(id, row),
    insert: (row) => ctx.db.insert("syncLinks", row),
  });
}
