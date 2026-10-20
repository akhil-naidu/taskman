/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as credentials from "../credentials.js";
import type * as fleet from "../fleet.js";
import type * as guard from "../guard.js";
import type * as http from "../http.js";
import type * as ingest from "../ingest.js";
import type * as ingestTokens from "../ingestTokens.js";
import type * as model_auth from "../model/auth.js";
import type * as model_clock from "../model/clock.js";
import type * as model_orgs from "../model/orgs.js";
import type * as model_parser from "../model/parser.js";
import type * as model_secrets from "../model/secrets.js";
import type * as model_store from "../model/store.js";
import type * as model_sync from "../model/sync.js";
import type * as model_text from "../model/text.js";
import type * as model_types from "../model/types.js";
import type * as model_view from "../model/view.js";
import type * as persist from "../persist.js";
import type * as sync from "../sync.js";
import type * as validators from "../validators.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  credentials: typeof credentials;
  fleet: typeof fleet;
  guard: typeof guard;
  http: typeof http;
  ingest: typeof ingest;
  ingestTokens: typeof ingestTokens;
  "model/auth": typeof model_auth;
  "model/clock": typeof model_clock;
  "model/orgs": typeof model_orgs;
  "model/parser": typeof model_parser;
  "model/secrets": typeof model_secrets;
  "model/store": typeof model_store;
  "model/sync": typeof model_sync;
  "model/text": typeof model_text;
  "model/types": typeof model_types;
  "model/view": typeof model_view;
  persist: typeof persist;
  sync: typeof sync;
  validators: typeof validators;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
