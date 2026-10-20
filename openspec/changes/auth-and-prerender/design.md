# Design

## Context

Password sign-in already uses Convex Auth. Convex still rejects those tokens because `convex/auth.config.ts` is missing. See proposal.md for why that blocks every authenticated call.

`cacheComponents` is on. `ConvexAuthNextjsServerProvider` reads the request cookie while rendering the root layout. With `NEXT_PUBLIC_CONVEX_URL` set, that read sits outside `<Suspense>`, so prerender fails for every route. Without that URL the provider is skipped and the build passes.

## Goals / Non-Goals

**Goals:**

- Register the Convex Auth issuer the library already uses.
- Keep the cookie read, and put it under a Suspense boundary shared by every route.
- Leave the example snapshot path unchanged when the public URL is unset.

**Non-Goals:**

- A second auth provider, custom JWT verification, or schema changes.
- `instant = false` or per-route `dynamic` opt-outs.
- Deploying anywhere except a dev push that the environment credential already targets.

## Decisions

### Auth config is the Convex Auth issuer

`convex/auth.config.ts` exports the provider `{ domain: process.env.CONVEX_SITE_URL, applicationID: "convex" }`. Convex Auth issues tokens for that site URL and audience. A custom JWT provider would duplicate the same issuer.

`CONVEX_SITE_URL` is set by Convex on the deployment. It is not a new app secret.

### Cookie read moves into a layout child

The root layout renders static `html` and `body`, then a `<Suspense>` fallback. An async child inside that boundary renders `ConvexAuthNextjsServerProvider` only when `NEXT_PUBLIC_CONVEX_URL` is set. The layout function itself does not read cookies.

Wrapping only `/board` would leave `/`, `/connections`, `/settings`, `/signin`, and the not-found route failing, because the stack is the root layout. `instant = false` would build, and it would drop the static shell this config is there to keep.

The fallback is the same short loading line the pages already use.

### Push only when the credential matches

Function push uses the existing `CONVEX_DEPLOY_KEY`. Push only if that key's deployment is the taskman dev deployment. A key for any other deployment is not used, and env vars are not changed to redirect it.

## Risks / Trade-offs

- [Whole-app Suspense] → The static shell is the document plus the loading fallback; page content streams after the cookie read. That is the streaming fix, not a blank page.
- [Auth config without a matching push] → The repo is correct, and a deployment that has not received the file still rejects tokens. Do not push to the wrong deployment to paper over that.
- [Provider skipped when the public URL is unset] → Example mode stays buildable. Live sign-in still requires the URL at runtime.

## Migration Plan

1. Add the auth config and the layout boundary.
2. Run `next build` with and without `NEXT_PUBLIC_CONVEX_URL`.
3. If the deploy key targets the taskman dev deployment, push functions only. Otherwise stop and name the missing dev key.
4. Rollback is reverting the two files. No table or env change is part of this change.
