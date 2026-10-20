import { v } from "convex/values";
import { internal } from "./_generated/api";
import { adapterFor } from "./model/sync";
import { planRemoteTasks } from "./model/store";
import { loadState, writeState } from "./persist";
import { action, internalMutation } from "./_generated/server";
import { remoteTaskValidator, syncProvider } from "./validators";

export const applyRemote = internalMutation({
  args: { provider: syncProvider, tasks: v.array(remoteTaskValidator) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const { state } = await loadState(ctx, true);
    const next = planRemoteTasks(state, { provider: args.provider, tasks: args.tasks }, { now: Date.now() });
    await writeState(ctx, next);
    return args.tasks.length;
  },
});

export const pull = action({
  args: { provider: syncProvider },
  returns: v.object({
    implemented: v.boolean(),
    imported: v.number(),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    let result;
    try {
      result = await adapterFor(args.provider).pull({
        token: process.env.CLICKUP_API_TOKEN,
        teamId: process.env.CLICKUP_TEAM_ID,
        listIds: (process.env.CLICKUP_LIST_IDS ?? "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      return { implemented: true, imported: 0, message };
    }
    if (!result.implemented || result.tasks.length === 0) {
      return { implemented: result.implemented, imported: 0, message: result.message };
    }
    const imported: number = await ctx.runMutation(internal.sync.applyRemote, {
      provider: args.provider,
      tasks: result.tasks,
    });
    return { implemented: true, imported, message: result.message };
  },
});
