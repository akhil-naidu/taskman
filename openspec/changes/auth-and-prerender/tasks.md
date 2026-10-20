# Tasks

## 1. Auth provider

- [x] 1.1 Add `convex/auth.config.ts` with domain `process.env.CONVEX_SITE_URL` and applicationID `convex` — verify: the file default-exports that provider and `pnpm typecheck` passes

## 2. Prerender boundary

- [x] 2.1 Move `ConvexAuthNextjsServerProvider` into a child of `<Suspense>` in the root layout, and keep the provider off when `NEXT_PUBLIC_CONVEX_URL` is unset — verify: `next build` passes with the public Convex URL unset and again with it set, including `/`, `/board`, `/connections`, `/settings`, `/signin`, and `/_not-found`

## 3. Dev deployment

- [x] 3.1 Push functions only when `CONVEX_DEPLOY_KEY` targets the taskman dev deployment `courteous-chicken-605` — verify: the key's deployment name is checked before any push, and a different deployment is not contacted
- [x] 3.2 After a matching push, sign in with email and password and run an authenticated query — verify: the query succeeds as that account; if the push was refused, record the error and the credential name instead of calling the wrong deployment
