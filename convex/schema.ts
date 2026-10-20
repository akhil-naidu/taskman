import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const taskStatus = v.union(v.literal("waiting"), v.literal("todo"), v.literal("in_progress"), v.literal("done"));
const urgency = v.union(v.literal("high"), v.literal("normal"));
const provider = v.union(
  v.literal("clickup"),
  v.literal("github"),
  v.literal("linear"),
  v.literal("jira"),
  v.literal("fleet"),
);
export const integrationProvider = v.union(
  v.literal("clickup"),
  v.literal("linear"),
  v.literal("github"),
  v.literal("jira"),
  v.literal("dropbox"),
);

const workspaceId = v.id("workspaces");

export default defineSchema({
  ...authTables,
  workspaces: defineTable({
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),
  members: defineTable({
    workspaceId,
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),
  credentials: defineTable({
    workspaceId,
    provider: integrationProvider,
    hint: v.string(),
    ciphertext: v.string(),
    iv: v.string(),
    config: v.string(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_provider", ["workspaceId", "provider"]),
  oauthStates: defineTable({
    state: v.string(),
    workspaceId,
    userId: v.id("users"),
    provider: integrationProvider,
    expiresAt: v.number(),
  }).index("by_state", ["state"]),
  ingestTokens: defineTable({
    workspaceId,
    name: v.string(),
    tokenHash: v.string(),
    hint: v.string(),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_tokenHash", ["tokenHash"]),
  bots: defineTable({
    workspaceId,
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
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_key", ["workspaceId", "key"]),
  routines: defineTable({
    workspaceId,
    key: v.string(),
    botKey: v.string(),
    name: v.string(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_key", ["workspaceId", "key"]),
  runs: defineTable({
    workspaceId,
    key: v.string(),
    botKey: v.string(),
    summary: v.string(),
    status: v.union(v.literal("ok"), v.literal("error"), v.literal("running"), v.literal("note")),
    startedAt: v.number(),
    finishedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_key", ["workspaceId", "key"]),
  tasks: defineTable({
    workspaceId,
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
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_key", ["workspaceId", "key"]),
  sources: defineTable({
    workspaceId,
    key: v.string(),
    provider,
    name: v.string(),
    readOnly: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_key", ["workspaceId", "key"]),
  syncLinks: defineTable({
    workspaceId,
    key: v.string(),
    sourceKey: v.string(),
    externalId: v.string(),
    taskKey: v.string(),
    taskId: v.id("tasks"),
    url: v.string(),
    lastSyncedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_key", ["workspaceId", "key"]),
  ingestRuns: defineTable({
    workspaceId,
    key: v.string(),
    receivedAt: v.number(),
    botCount: v.number(),
    taskCount: v.number(),
    status: v.union(v.literal("ok"), v.literal("error")),
    message: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_key", ["workspaceId", "key"]),
});
