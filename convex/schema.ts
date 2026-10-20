import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const scope = v.string();
const taskStatus = v.union(v.literal("waiting"), v.literal("todo"), v.literal("in_progress"), v.literal("done"));
const urgency = v.union(v.literal("high"), v.literal("normal"));
const provider = v.union(
  v.literal("clickup"),
  v.literal("github"),
  v.literal("linear"),
  v.literal("jira"),
  v.literal("fleet"),
);

export default defineSchema({
  bots: defineTable({
    scope,
    key: v.string(),
    name: v.string(),
    description: v.string(),
    role: v.string(),
    org: v.string(),
    orgColor: v.string(),
    avatarColor: v.string(),
    avatarShape: v.string(),
    wake: v.string(),
    lastRunText: v.string(),
    openCount: v.number(),
    openItems: v.array(v.string()),
    activity: v.array(v.string()),
    notes: v.array(v.string()),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_scope", ["scope"])
    .index("by_org", ["org"]),

  routines: defineTable({
    scope,
    key: v.string(),
    botKey: v.string(),
    name: v.string(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_scope", ["scope"])
    .index("by_botKey", ["botKey"]),

  runs: defineTable({
    scope,
    key: v.string(),
    botKey: v.string(),
    summary: v.string(),
    status: v.union(v.literal("ok"), v.literal("error"), v.literal("running"), v.literal("note")),
    startedAt: v.number(),
    finishedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_scope", ["scope"])
    .index("by_botKey", ["botKey"]),

  tasks: defineTable({
    scope,
    key: v.string(),
    title: v.string(),
    status: taskStatus,
    ownerBotKey: v.string(),
    ownerLabel: v.string(),
    org: v.string(),
    orgColor: v.string(),
    urgency,
    claimKey: v.string(),
    conflict: v.boolean(),
    claimantKeys: v.array(v.string()),
    sourceKey: v.string(),
    externalId: v.string(),
    externalUrl: v.string(),
    addedDate: v.string(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_scope", ["scope"])
    .index("by_status", ["status"])
    .index("by_claimKey", ["claimKey"])
    .index("by_sourceKey", ["sourceKey"]),

  sources: defineTable({
    scope,
    key: v.string(),
    provider,
    name: v.string(),
    readOnly: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_scope", ["scope"])
    .index("by_provider", ["provider"]),

  syncLinks: defineTable({
    scope,
    key: v.string(),
    sourceKey: v.string(),
    externalId: v.string(),
    taskKey: v.string(),
    taskId: v.id("tasks"),
    url: v.string(),
    lastSyncedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_scope", ["scope"])
    .index("by_taskKey", ["taskKey"]),

  ingestRuns: defineTable({
    scope,
    key: v.string(),
    receivedAt: v.number(),
    botCount: v.number(),
    taskCount: v.number(),
    status: v.union(v.literal("ok"), v.literal("error")),
    message: v.string(),
  })
    .index("by_key", ["key"])
    .index("by_scope", ["scope"]),
});
