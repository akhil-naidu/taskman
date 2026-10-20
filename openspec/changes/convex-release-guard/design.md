# Design

## Context

Convex rejects a module path component that is not letters, numbers, underscores, or periods. `model/setup-prompt.js` fails the push, so later functions in that bundle, including `workspaces:reset`, stay unpublished. The Next.js image is built by the Dockerfile on Railway and does not run `npx convex deploy` today. `ConvexAuthNextjsServerProvider` stores `Date.now()` on server auth state. With `cacheComponents`, that call is logged for `/` and `/signin` unless the shell waits for the request first.

## Goals / Non-Goals

**Goals:**

- Make the Convex bundle path valid.
- Fail pull requests that reintroduce an invalid module path, and typecheck Convex functions without contacting a deployment.
- Order the image build as deploy, public-function check, Next.js build.
- Stop the auth shell from reading the clock during prerender.

**Non-Goals:**

- Running `npx convex deploy` or pushing functions from this change.
- Changing reset authorization, the tables it deletes, or the Settings dialog.
- Adding a production deploy GitHub Action in addition to the image build.

## Decisions

1. Rename the file to `setupPrompt.ts`. The bundled component is `setupPrompt.js`, which matches the Convex path rule. Underscores would also pass. Camel case matches the other model files.
2. CI runs `pnpm check:convex`: a local path walk, then `npx convex typecheck`. `npx convex codegen` asks for a deployment, so it stays inside `npx convex deploy --codegen enable` on release. The path check is the guard that would have caught `setup-prompt.js` without a deploy key.
3. The Dockerfile runs `pnpm exec convex deploy --typecheck enable --codegen enable`, then `scripts/check-deployed-functions.ts`, then `pnpm build`. `CONVEX_DEPLOY_KEY` is a build arg and is not copied into the runtime image. `CONVEX_DEPLOYMENT` is not set, so the key selects the deployment. `--cmd` is not used, because that flag runs the frontend command before the push.
4. The function check reads `npx convex function-spec` and requires a public `workspaces:reset`. Identifiers may be `workspaces.js:reset` or `workspaces:reset`. An internal function with that name does not pass.
5. `AuthShell` calls `await connection()` before `ConvexAuthNextjsServerProvider` when `NEXT_PUBLIC_CONVEX_URL` is set. The provider stays inside the existing Suspense boundary. Without the public URL, the provider is still omitted.

## Risks / Trade-offs

- A Railway build now fails until `CONVEX_DEPLOY_KEY` is set on the service and available as a Docker build arg. That is the intended gate.
- If the key points at the wrong deployment, the image build would push there. The variable must be a key for this app's deployment. This change does not set it.
- Convex still deploys if the Next.js build later fails. The failed image is not shipped. The function check runs before `pnpm build`, so a missing `workspaces:reset` also stops the image.
- A non-interactive deploy still stops when it would delete or backfill a large index, unless someone passes `--skip-large-indexes-check`. This change does not pass that flag.

## Migration Plan

1. Merge the module rename and the pipeline.
2. Set `CONVEX_DEPLOY_KEY` on the web service for the image build. Do not commit the value.
3. The next image build pushes Convex, checks `workspaces:reset`, then builds Next.js.

## Open Questions

- None.
