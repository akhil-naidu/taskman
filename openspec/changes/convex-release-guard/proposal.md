# Proposal

## Why

Production reset fails because `workspaces:reset` was never published. `npx convex deploy` rejects the hyphen in `model/setup-prompt.js`, so the push stops before that mutation exists. With the public Convex URL set, `/` and `/signin` also log a prerender error because the auth provider reads `Date.now()` while Next is still building the static shell.

## What Changes

- Rename `convex/model/setup-prompt.ts` to `convex/model/setupPrompt.ts` and update imports.
- Reject Convex module paths that contain characters outside letters, numbers, underscores, and periods. Run that check and `npx convex typecheck` on every pull request.
- Run `npx convex deploy` in the image build, then confirm `workspaces:reset` is public, then run `pnpm build`. Do not execute that deploy from this change.
- Call `connection()` before the auth provider so `Date.now()` runs at request time.

## Capabilities

### New Capabilities

- `convex-release`: Convex module paths can be deployed, pull requests reject invalid paths, and the image build pushes functions before the Next.js build.

### Modified Capabilities

## Impact

- `convex/model/setupPrompt.ts` replaces `convex/model/setup-prompt.ts`.
- CI gains a `convex` job. The Docker build needs `CONVEX_DEPLOY_KEY` at build time.
- `app/layout.tsx` waits for the request before rendering the auth provider.
- No production deploy is run by this change.
