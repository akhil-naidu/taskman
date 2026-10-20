import { v } from "convex/values";
import type { FleetState } from "./model/types";
import { loadState, writeState } from "./persist";
import { internalMutation, internalQuery } from "./_generated/server";

export const load = internalQuery({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args): Promise<FleetState> => {
    const { state } = await loadState(ctx, args.workspaceId);
    return state;
  },
});

export const save = internalMutation({
  args: { workspaceId: v.id("workspaces"), state: v.any() },
  handler: async (ctx, args): Promise<null> => {
    await writeState(ctx, args.workspaceId, args.state as FleetState);
    return null;
  },
});
