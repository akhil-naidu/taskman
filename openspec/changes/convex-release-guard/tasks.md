# Tasks

## 1. Module path

- [x] 1.1 Rename `convex/model/setup-prompt.ts` to `convex/model/setupPrompt.ts` and update imports — verify: `pnpm test` and `pnpm exec tsx scripts/check-convex-module-paths.ts`

## 2. Pull request checks

- [x] 2.1 Add a CI job that rejects invalid Convex module paths and runs `npx convex typecheck` — verify: `pnpm check:convex`

## 3. Release order

- [x] 3.1 Run `npx convex deploy`, then the public-function check, then `pnpm build` in the Docker image. Do not execute the deploy — verify: Dockerfile order and `tests/convex-release.test.ts`

## 4. Prerender

- [x] 4.1 Call `connection()` before the auth provider when the public Convex URL is set — verify: request `/` and `/signin` with `NEXT_PUBLIC_CONVEX_URL` set and confirm the server log has no `Date.now()` prerender error
