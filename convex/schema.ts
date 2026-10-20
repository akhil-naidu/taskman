import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const taskStatus = v.union(
  v.literal("waiting"),
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("done"),
  v.literal("backlog"),
  v.literal("approved"),
  v.literal("waiting_human"),
);
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
    canWrite: v.optional(v.boolean()),
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
    reportedStatus: v.optional(v.union(v.literal("waiting"), v.literal("active"), v.literal("routine"), v.literal("on-demand"))),
    origin: v.optional(v.union(v.literal("mcp"), v.literal("fleet"))),
    heartbeatStatus: v.optional(v.string()),
    currentTaskKey: v.optional(v.string()),
    currentTaskText: v.optional(v.string()),
    lastHeartbeatAt: v.optional(v.number()),
    webhookConfigured: v.optional(v.boolean()),
    webhookLastDeliveryAt: v.optional(v.number()),
    webhookLastError: v.optional(v.string()),
    relayStatus: v.optional(v.union(v.literal("delivered"), v.literal("retrying"), v.literal("undelivered"), v.literal("relayed"))),
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
    needsHuman: v.optional(v.boolean()),
    question: v.optional(v.string()),
    options: v.optional(v.array(v.string())),
    progress: v.optional(v.array(v.string())),
    decision: v.optional(v.string()),
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
  webhookDeliveries: defineTable({
    workspaceId,
    key: v.string(),
    botKey: v.string(),
    event: v.union(v.literal("decision_recorded"), v.literal("task_approved"), v.literal("instruction_added")),
    taskKey: v.string(),
    title: v.string(),
    decision: v.string(),
    boardUrl: v.string(),
    status: v.union(v.literal("pending"), v.literal("delivered"), v.literal("undelivered"), v.literal("relayed")),
    attempts: v.number(),
    lastError: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deliveredAt: v.number(),
    relayedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_key", ["workspaceId", "key"]),
  botWebhooks: defineTable({
    workspaceId,
    botKey: v.string(),
    ciphertext: v.string(),
    iv: v.string(),
    hint: v.string(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_bot", ["workspaceId", "botKey"]),
  instructions: defineTable({
    workspaceId,
    key: v.string(),
    botKey: v.string(),
    taskKey: v.string(),
    kind: v.union(v.literal("instruction"), v.literal("decision")),
    body: v.string(),
    options: v.array(v.string()),
    answer: v.string(),
    status: v.union(v.literal("pending"), v.literal("acked")),
    createdAt: v.number(),
    ackedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_key", ["workspaceId", "key"]),
  oauthClients: defineTable({
    clientId: v.string(),
    clientSecretHash: v.optional(v.string()),
    clientName: v.string(),
    redirectUris: v.array(v.string()),
    tokenEndpointAuthMethod: v.string(),
    createdAt: v.number(),
  }).index("by_clientId", ["clientId"]),
  oauthCodes: defineTable({
    codeHash: v.string(),
    clientId: v.string(),
    userId: v.id("users"),
    workspaceId,
    redirectUri: v.string(),
    codeChallenge: v.string(),
    scopes: v.array(v.string()),
    resource: v.string(),
    expiresAt: v.number(),
    consumedAt: v.optional(v.number()),
  }).index("by_codeHash", ["codeHash"]),
  oauthTokens: defineTable({
    tokenHash: v.string(),
    kind: v.union(v.literal("access"), v.literal("refresh")),
    clientId: v.string(),
    userId: v.id("users"),
    workspaceId,
    scopes: v.array(v.string()),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    replacedByHash: v.optional(v.string()),
  }).index("by_tokenHash", ["tokenHash"]),
});
