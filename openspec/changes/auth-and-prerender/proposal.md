# Proposal

## Why

Signed-in Convex calls fail because the deployment has no auth provider configured, so every authenticated query is rejected. With Cache Components on, the root layout also reads the auth cookie outside `<Suspense>`, so `next build` cannot prerender any route once `NEXT_PUBLIC_CONVEX_URL` is set.

## What Changes

- Configure Convex Auth as the only auth provider: issuer domain `process.env.CONVEX_SITE_URL`, application ID `convex`.
- Move that cookie read inside a `<Suspense>` boundary in the root layout so every App Router route can prerender a static shell when the public Convex URL is set.
- Keep password sign-in and workspace membership checks as they are.

## Capabilities

### New Capabilities

- `session-auth`: A password session issued by Convex Auth is accepted by Convex, and the Next.js shell can prerender while that session cookie is read at request time.

### Modified Capabilities

## Impact

- New `convex/auth.config.ts`. No schema change and no new platform secret.
- `app/layout.tsx` wraps the Convex Auth server provider in `<Suspense>`.
- `next build` is expected to pass for `/`, `/board`, `/connections`, `/settings`, `/signin`, and the not-found route with `NEXT_PUBLIC_CONVEX_URL` set.

## Out of scope

- Production Convex deploy, Railway deploy, and changing Convex or Railway settings.
- Pushing functions with a credential that does not target the taskman dev deployment.
- Email delivery, password reset, and OAuth sign-in.
- Opting routes out of Cache Components with `instant = false`.
