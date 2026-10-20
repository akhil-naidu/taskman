# Tasks

## 1. Schema and auth

- [x] 1.1 Add Convex Auth password sign-up and the workspace and member tables — verify: an unauthenticated fleet query is rejected
- [x] 1.2 Scope bots, routines, runs, tasks, sources, sync links, and ingest runs by workspace id — verify: a write for workspace A does not change workspace B
- [x] 1.3 Add hashed ingest tokens and encrypted integration credentials — verify: stored ingest value is not the raw token, and a listed credential has a hint and no secret

## 2. Settings and sync

- [x] 2.1 Settings can create a workspace, paste or start OAuth for ClickUp, Linear, GitHub, Jira, and Dropbox, and issue or revoke an ingest token — verify: the raw ingest token is returned once and a later read does not include it
- [x] 2.2 ClickUp pull decrypts that workspace's credential and does not read `CLICKUP_API_TOKEN` — verify: unit test passes a credential in and does not require the env var
- [x] 2.3 Remove integration env vars from `.env.example` and from code — verify: search finds no `CLICKUP_API_TOKEN`, `GITHUB_TOKEN`, `LINEAR_API_KEY`, `JIRA_API_TOKEN`, or `DROPBOX` token env read

## 3. Verification

- [x] 3.1 `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass
- [ ] 3.2 Push schema and functions to the dev deployment `courteous-chicken-605` and set platform env vars only — verify: the dev `.convex.cloud` and `.convex.site` hosts accept the new functions
