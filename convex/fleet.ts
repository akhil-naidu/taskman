import { v } from "convex/values";
import { requireMember } from "./guard";
import { rowsToView } from "./model/view";
import { loadState } from "./persist";
import { query } from "./_generated/server";
import { fleetViewValidator } from "./validators";

export const overview = query({
  args: { workspaceId: v.id("workspaces"), now: v.number() },
  returns: fleetViewValidator,
  handler: async (ctx, args) => {
    await requireMember(ctx, args.workspaceId);
    const { state, truncated } = await loadState(ctx, args.workspaceId);
    return rowsToView(state, args.now, truncated);
  },
});
