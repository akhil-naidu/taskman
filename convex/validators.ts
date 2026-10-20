import { v } from "convex/values";

export const taskStatus = v.union(
  v.literal("waiting"),
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("done"),
  v.literal("backlog"),
  v.literal("approved"),
  v.literal("waiting_human"),
);
export const urgency = v.union(v.literal("high"), v.literal("normal"));
export const syncProvider = v.union(v.literal("clickup"), v.literal("github"), v.literal("linear"), v.literal("jira"));

export const snapshotValidator = v.object({
  generatedAt: v.number(),
  bots: v.array(
    v.object({
      key: v.string(),
      name: v.string(),
      description: v.string(),
      role: v.string(),
      org: v.string(),
      orgColor: v.string(),
      avatarColor: v.string(),
      avatarShape: v.string(),
      wake: v.string(),
      routines: v.array(v.string()),
      lastRun: v.string(),
      activity: v.array(v.string()),
      notes: v.array(v.string()),
      open: v.array(v.string()),
    }),
  ),
  waiting: v.array(
    v.object({
      title: v.string(),
      owner: v.string(),
      date: v.string(),
      source: v.string(),
      urgency,
      conflict: v.boolean(),
      claimantKeys: v.array(v.string()),
      clusterId: v.string(),
    }),
  ),
  tasks: v.array(
    v.object({
      key: v.string(),
      title: v.string(),
      status: taskStatus,
      owner: v.string(),
      org: v.string(),
      urgency,
      claimants: v.array(v.string()),
      source: v.string(),
      externalId: v.string(),
      url: v.string(),
    }),
  ),
});

export const ingestResult = v.object({
  bots: v.number(),
  routines: v.number(),
  runs: v.number(),
  tasks: v.number(),
  syncLinks: v.number(),
});

const botView = v.object({
  key: v.string(),
  name: v.string(),
  org: v.string(),
  orgColor: v.string(),
  avatarColor: v.string(),
  avatarShape: v.string(),
  role: v.string(),
  wake: v.string(),
  routines: v.array(v.string()),
  lastRun: v.string(),
  openCount: v.number(),
  openItems: v.array(v.string()),
  activity: v.array(v.string()),
  notes: v.array(v.string()),
  status: v.union(v.literal("waiting"), v.literal("active"), v.literal("routine"), v.literal("on-demand")),
  currentWork: v.string(),
  heartbeatStatus: v.string(),
  lastHeartbeatAt: v.number(),
  currentTask: v.string(),
});

const taskView = v.object({
  key: v.string(),
  title: v.string(),
  status: taskStatus,
  ownerBotKey: v.optional(v.string()),
  ownerLabel: v.string(),
  org: v.string(),
  orgColor: v.string(),
  urgency,
  conflict: v.boolean(),
  claimants: v.array(v.string()),
  sourceKey: v.string(),
  externalUrl: v.optional(v.string()),
  addedDate: v.optional(v.string()),
  needsHuman: v.boolean(),
  question: v.string(),
  options: v.array(v.string()),
  progress: v.array(v.string()),
  decision: v.string(),
});

export const fleetViewValidator = v.object({
  generatedAt: v.number(),
  bots: v.array(botView),
  tasks: v.array(taskView),
  instructions: v.array(
    v.object({
      key: v.string(),
      botKey: v.string(),
      taskKey: v.string(),
      kind: v.union(v.literal("instruction"), v.literal("decision")),
      body: v.string(),
      answer: v.string(),
      status: v.union(v.literal("pending"), v.literal("acked")),
    }),
  ),
  tiles: v.object({
    bots: v.number(),
    orgs: v.number(),
    routines: v.number(),
    active: v.number(),
    waiting: v.number(),
    high: v.number(),
  }),
  truncated: v.boolean(),
});

export const remoteTaskValidator = v.object({
  externalId: v.string(),
  title: v.string(),
  url: v.optional(v.string()),
  status: taskStatus,
  org: v.optional(v.string()),
  ownerBotKey: v.optional(v.string()),
  ownerLabel: v.optional(v.string()),
  urgency: v.optional(urgency),
});
