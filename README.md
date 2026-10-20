# taskman

Fleet and board for a group of assistant bots. A machine outside this app pushes a snapshot into Convex. The web app reads that snapshot. It does not read the source machine's files.

## Local development

```bash
pnpm install
npx convex dev
pnpm dev
```

`npx convex dev` writes `CONVEX_URL` and `CONVEX_DEPLOYMENT` into `.env.local`. Copy `CONVEX_URL` to `NEXT_PUBLIC_CONVEX_URL` in that same file. Without `NEXT_PUBLIC_CONVEX_URL`, the UI shows the checked-in example snapshot (`bot-a` through `bot-e`).

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

## Environment

Names only. Put values in `.env.local` or the host's secret store. `.env.example` lists every name with an empty value.

| Name | Used for |
| --- | --- |
| `CONVEX_DEPLOYMENT` | Dev deployment name from `npx convex dev` |
| `CONVEX_URL` | Convex cloud URL for server clients |
| `NEXT_PUBLIC_CONVEX_URL` | Same cloud URL, read by the browser |
| `CONVEX_DEPLOY_KEY` | Convex deploy key. Not read at runtime |
| `TASKMAN_INGEST_TOKEN` | Shared secret for ingest |
| `TASKMAN_INGEST_URL` | Convex HTTP route, `https://<deployment>.convex.site/ingest` |
| `CLICKUP_API_TOKEN` | Read-only ClickUp token |
| `CLICKUP_TEAM_ID` | ClickUp workspace id |
| `CLICKUP_LIST_IDS` | Comma-separated ClickUp list ids |
| `GITHUB_TOKEN` | Reserved. Unused |
| `LINEAR_API_KEY` | Reserved. Unused |
| `JIRA_BASE_URL` | Reserved. Unused |
| `JIRA_EMAIL` | Reserved. Unused |
| `JIRA_API_TOKEN` | Reserved. Unused |

HTTP actions are served from the `.convex.site` host. Queries and the browser client use the `.convex.cloud` host.

## Ingest

`scripts/push-fleet.ts` reads a directory and POSTs one snapshot.

```
fixtures/fleet/
  config.json
  pending.md
  INDEX.md
  tasks.json
  agents/<name>/profile.json
  notes/...
```

`config.json` uses `org_map`, `org_colours`, `known_routines`, `notes`, `last_run`, and `role_override`. Checked lines in `pending.md` are skipped. Open items come from unchecked `- [ ]` lines and from a `## Waiting on …` section. Dated note lines become recent activity. Two bots with overlapping open items keep both items and get a conflict flag.

```bash
pnpm push-fleet -- --root fixtures/fleet --dry-run
pnpm push-fleet -- --root fixtures/fleet
```

The live command reads `TASKMAN_INGEST_URL` and `TASKMAN_INGEST_TOKEN`. It sends `x-taskman-token`. Posting the same snapshot twice upserts by stable keys and does not create duplicate bots, routines, tasks, or sync links.

The HTTP route is `POST /ingest`. A Convex mutation, `ingestFleet`, checks the same secret when a caller uses the Convex client instead of HTTP. Prefer the HTTP route.

Lists are capped (200 bots, 500 tasks). An ingest that would pass the cap fails instead of dropping rows.

## Sync

Adapters live in `convex/model/sync.ts`. Each one is read-only: `pull` only, no create or update method.

- **ClickUp** is implemented. It GETs list or team tasks, keeps the external id and URL, and upserts on `clickup:<id>`. Set `CLICKUP_LIST_IDS` or `CLICKUP_TEAM_ID` plus `CLICKUP_API_TOKEN`. The Board page runs it with **Sync ClickUp**. There is no write-back.
- **GitHub Issues, Linear, and Jira** are stubs. Their buttons report that the adapter is not implemented and do not call those APIs.

## Railway

The image is built from the `Dockerfile` (`output: "standalone"`). `railway.toml` points Railway at that file and starts `node server.js`. Pass `NEXT_PUBLIC_CONVEX_URL` as a build arg so the browser bundle can reach Convex. Do not bake secrets into the image. This repo's CI does not deploy.

## Tests

`pnpm test` covers the parser (dedupe, urgency, status, activity), ingest idempotency, the ClickUp mapper, and the push script's dry-run. After editing `fixtures/fleet`, run `pnpm freeze-example` and commit `fixtures/demo-snapshot.json`.
