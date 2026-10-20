# taskman

Fleet and board for a group of assistant bots. A machine outside this app pushes a snapshot into Convex. The web app reads that snapshot. It does not read the source machine's files.

## Local development

```bash
pnpm install
npx convex dev
pnpm dev
```

`npx convex dev` writes `CONVEX_URL` and `CONVEX_DEPLOYMENT` into `.env.local`. Copy `CONVEX_URL` to `NEXT_PUBLIC_CONVEX_URL` in that same file. Without `NEXT_PUBLIC_CONVEX_URL`, the UI shows the checked-in example snapshot (`bot-a` through `bot-e`). With it set, sign in, create a workspace, and connect trackers from Settings.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

## Dev deployment

The shared dev deployment is `dev:courteous-chicken-605` (project `taskman`, team `mobile`).

| Surface | URL |
| --- | --- |
| Queries and the browser client | `https://courteous-chicken-605.convex.cloud` |
| HTTP actions | `https://courteous-chicken-605.convex.site` |
| Ingest | `https://courteous-chicken-605.convex.site/ingest` |

For the Next.js process, set `NEXT_PUBLIC_CONVEX_URL` to the `.convex.cloud` URL and `TASKMAN_INGEST_URL` to the ingest URL. Keep `CONVEX_DEPLOY_KEY` in the environment or a host secret store. Do not commit it.

Push schema and functions to that dev deployment with a dev deploy key:

```bash
CONVEX_DEPLOY_KEY='<dev deploy key>' npx convex dev --once
```

`npx convex deploy` targets a production or preview deployment. Use `npx convex dev --once` for this dev deployment.

Set platform environment variables on the same deployment. The key selects the deployment, so these commands do not need `--prod`:

```bash
CONVEX_DEPLOY_KEY='<dev deploy key>' npx convex env set JWT_PRIVATE_KEY "$JWT_PRIVATE_KEY"
CONVEX_DEPLOY_KEY='<dev deploy key>' npx convex env set JWKS "$JWKS"
CONVEX_DEPLOY_KEY='<dev deploy key>' npx convex env set SITE_URL "$SITE_URL"
CONVEX_DEPLOY_KEY='<dev deploy key>' npx convex env set TASKMAN_ENCRYPTION_KEY "$TASKMAN_ENCRYPTION_KEY"
CONVEX_DEPLOY_KEY='<dev deploy key>' npx convex env list --names-only
```

`JWT_PRIVATE_KEY` and `JWKS` are the Convex Auth signing keys. `TASKMAN_ENCRYPTION_KEY` is 32 bytes of base64 and encrypts workspace integration secrets. Customer tracker tokens are not environment variables. Optional `TASKMAN_OAUTH_*_CLIENT_ID` and `TASKMAN_OAUTH_*_CLIENT_SECRET` pairs are the TaskMan app's OAuth client, used only when a workspace starts OAuth. Leave them unset to paste a token in Settings.

## Environment

Names only. Put values in `.env.local` or the host's secret store. `.env.example` lists every name with an empty value.

| Name | Used for |
| --- | --- |
| `CONVEX_DEPLOYMENT` | Dev deployment name from `npx convex dev` |
| `CONVEX_URL` | Convex cloud URL for server clients |
| `NEXT_PUBLIC_CONVEX_URL` | Same cloud URL, read by the browser |
| `CONVEX_DEPLOY_KEY` | Convex deploy key. Not read at runtime |
| `JWT_PRIVATE_KEY` | Convex Auth signing key. Set on the Convex deployment |
| `JWKS` | Convex Auth public key set. Set on the Convex deployment |
| `SITE_URL` | Browser origin, used when OAuth returns to the app |
| `TASKMAN_ENCRYPTION_KEY` | Platform key that encrypts workspace integration secrets |
| `TASKMAN_OAUTH_*_CLIENT_ID` | Optional platform OAuth client id. Not a customer token |
| `TASKMAN_OAUTH_*_CLIENT_SECRET` | Optional platform OAuth client secret. Not a customer token |
| `TASKMAN_INGEST_URL` | Convex HTTP route, `https://<deployment>.convex.site/ingest` |

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
pnpm push-fleet -- --root fixtures/fleet --token '<workspace ingest token>'
```

The live command reads `TASKMAN_INGEST_URL` and a workspace ingest token passed with `--token`. It sends `x-taskman-token`. Create that token on the Connections page. The server stores only a hash, and the push writes only that workspace. Posting the same snapshot twice upserts by stable keys and does not create duplicate bots, routines, tasks, or sync links.

The HTTP route is `POST /ingest`. A Convex mutation, `ingestFleet`, checks the same workspace token when a caller uses the Convex client instead of HTTP. Prefer the HTTP route. A missing, unknown, or revoked token is rejected.

Lists are capped (200 bots, 500 tasks). An ingest that would pass the cap fails instead of dropping rows.

## Grok Bot connector

TaskMan is a remote MCP server. Add it to a Grok Bot as a custom remote MCP server. The connection is for the human's account. xAI discovers OAuth from the URL. There is no separate Grok sign-in. The consent page uses TaskMan email and password, then the human picks a workspace.

- Path: `https://<your-app-origin>/api/mcp`
- Transport: streamable HTTP
- Auth: OAuth 2.1 authorization code with PKCE. Do not paste a personal token.
- Discovery: `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`
- `GET /api/mcp` returns 405. The server answers one JSON-RPC message and does not keep a session.

The Connect page shows that URL and a prompt to paste for a Grok Bot user.

A workspace ingest token from Connections is the other credential. Send it as `Authorization: Bearer <workspace source token>`.

- That token works on `POST /api/mcp`.
- It also works on the Convex HTTP path `POST https://<deployment>.convex.site/mcp`.

Both paths use the same tools and the same workspace. Convex `POST /mcp` does not start OAuth. Leave write off on the Connections token for a read-only connector. Read tools include `list_bots`, `get_bot`, `list_tasks`, `get_task`, `list_board`, `list_waiting_on_owner`, `list_conflicts`, and `get_pending_instructions`. A write grant or the `board:write` scope can also call `register_bot`, `heartbeat`, `create_task`, `update_task`, `report_progress`, `complete_task`, `claim_task`, `update_task_status`, `report_bot_status`, and `ack_instruction`. Every tool uses that token's workspace only.

## Sync

Adapters live in `convex/model/sync.ts`. Each one is read-only: `pull` only, no create or update method.

- **ClickUp** is implemented. It GETs list or team tasks with the token saved on the workspace, keeps the external id and URL, and upserts on `clickup:<id>`. Put a team id or list ids on that connection. The Board page runs it with **Sync ClickUp**. There is no write-back.
- **GitHub Issues, Linear, and Jira** are stubs. Their buttons report that the adapter is not implemented and do not call those APIs. Credentials for those providers, and for Dropbox, can still be saved on the workspace.

## OpenSpec

Behavior is specified in `openspec/`. `openspec/project.md` is the product context. `openspec/specs/` is the baseline. New behavior starts as a change under `openspec/changes/` (`proposal.md`, `tasks.md`, and spec deltas) before feature code. `AGENTS.md` is the workflow for later agents.

```bash
npx @fission-ai/openspec validate --all --strict
```

## Railway

The image is built from the `Dockerfile` (`output: "standalone"`). `railway.toml` points Railway at that file and starts `node server.js`. Pass `NEXT_PUBLIC_CONVEX_URL` as a build arg so the browser bundle can reach Convex. Do not bake secrets into the image. This repo's CI does not deploy.

## Tests

`pnpm test` covers the parser (dedupe, urgency, status, activity), ingest idempotency, the ClickUp mapper, and the push script's dry-run. After editing `fixtures/fleet`, run `pnpm freeze-example` and commit `fixtures/demo-snapshot.json`.
