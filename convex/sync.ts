import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { decryptWorkspaceToken, readConfig } from "./model/secrets";
import { adapterFor } from "./model/sync";
import { planRemoteTasks } from "./model/store";
import type { SyncProvider } from "./model/types";
import { loadState, writeState } from "./persist";
import { internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";
import { remoteTaskValidator, syncProvider } from "./validators";

const LABELS: Record<SyncProvider, string> = {
  clickup: "ClickUp",
  github: "GitHub",
  linear: "Linear",
  jira: "Jira",
};

export const applyRemote = internalMutation({
  args: { workspaceId: v.id("workspaces"), provider: syncProvider, tasks: v.array(remoteTaskValidator) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const { state } = await loadState(ctx, args.workspaceId, true);
    const next = planRemoteTasks(state, { provider: args.provider, tasks: args.tasks }, { now: Date.now() });
    await writeState(ctx, args.workspaceId, next);
    return args.tasks.length;
  },
});

export const pull = action({
  args: { workspaceId: v.id("workspaces"), provider: syncProvider },
  returns: v.object({
    implemented: v.boolean(),
    imported: v.number(),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const sealed = await ctx.runQuery(internal.credentials.openSecret, {
      workspaceId: args.workspaceId,
      userId,
      provider: args.provider,
    });
    if (!sealed) {
      return { implemented: true, imported: 0, message: `Connect ${LABELS[args.provider]} in settings` };
    }
    let token: string;
    try {
      const decrypted = await decryptWorkspaceToken(process.env.TASKMAN_ENCRYPTION_KEY, sealed);
      if (!decrypted) return { implemented: true, imported: 0, message: `Connect ${LABELS[args.provider]} in settings` };
      token = decrypted;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read the stored credential";
      return { implemented: true, imported: 0, message };
    }
    const config = readConfig(sealed.config);
    let result;
    try {
      result = await adapterFor(args.provider).pull({
        token,
        teamId: config.teamId,
        listIds: config.listIds,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      return { implemented: true, imported: 0, message };
    }
    if (!result.implemented || result.tasks.length === 0) {
      return { implemented: result.implemented, imported: 0, message: result.message };
    }
    const imported: number = await ctx.runMutation(internal.sync.applyRemote, {
      workspaceId: args.workspaceId,
      provider: args.provider,
      tasks: result.tasks,
    });
    return { implemented: true, imported, message: result.message };
  },
});
