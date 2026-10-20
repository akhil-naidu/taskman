import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import type * as fleet from "../fleet.js";
import type * as ingest from "../ingest.js";
import type * as sync from "../sync.js";

declare const fullApi: ApiFromModules<{
  fleet: typeof fleet;
  ingest: typeof ingest;
  sync: typeof sync;
}>;

export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
