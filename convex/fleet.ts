import { v } from "convex/values";
import { rowsToView } from "./model/view";
import { loadState } from "./persist";
import { query } from "./_generated/server";
import { fleetViewValidator } from "./validators";

export const overview = query({
  args: { now: v.number() },
  returns: fleetViewValidator,
  handler: async (ctx, args) => {
    const { state, truncated } = await loadState(ctx);
    return rowsToView(state, args.now, truncated);
  },
});
