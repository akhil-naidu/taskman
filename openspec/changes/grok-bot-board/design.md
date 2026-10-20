# Design

## Context

See proposal.md for why this change exists. The connections work already serves stateless streamable HTTP at Convex `POST /mcp`. That route hashes a workspace ingest token, loads that workspace's fleet state, and runs `handleMcpMessage` in `convex/model/mcp.ts`. Read tools and write tools (`claim_task`, `update_task_status`, `report_bot_status`) are already specified and tested. Sign-in is Convex Auth email and password. The board columns today are waiting, to do, in progress, and done.

xAI discovers OAuth from the MCP URL the human pastes. That URL has to live on the Next.js origin so the consent page can use the existing session. Convex HTTP actions are a different host and cannot show that page.

## Goals / Non-Goals

**Goals:**

- One OAuth 2.1 resource server at `POST /api/mcp`, plus discovery, registration, and PKCE.
- The same JSON-RPC handler for both MCP URLs.
- Workspace-scoped bot registration, tasks, claims, and instructions.
- Board, inbox, bots, and Connect pages on the existing shell.

**Non-Goals:**

- Sign in with X. Email and password stay the only login. A later change can add an X provider beside the password provider without changing the grant model.
- Pushing this schema to a Convex deployment.
- Per-bot tokens. The OAuth grant is the signed-in user plus one workspace.
- Replacing ingest. A fleet push still upserts the snapshot. MCP-created bots and tasks survive that push.

## Decisions

### `/api/mcp` and Convex `/mcp` are one handler, two documented doors

`/api/mcp` is the URL on the Connect page. It is the OAuth protected resource. It accepts an OAuth access token or a workspace ingest token. Both are sha256-hashed before lookup. The route then calls the shared `handleMcpMessage`.

Convex `POST /mcp` stays. It still accepts only a workspace ingest token, for clients that already saved `https://<deployment>.convex.site/mcp`. It does not start an OAuth flow. `GET` on both paths returns 405. The README and the Connect page name both URLs, the transport, and which credential each one takes.

Alternative considered: delete Convex `/mcp`. That would strand the connector path the connections change already documents. Alternative considered: proxy Convex `/mcp` at `/api/mcp` with no OAuth. Grok Bot would not be able to complete discovery.

### OAuth 2.1 on the app origin

Public routes, excluded from the sign-in redirect:

- `GET /.well-known/oauth-protected-resource`
- `GET /.well-known/oauth-protected-resource/api/mcp`
- `GET /.well-known/oauth-authorization-server`
- `POST /api/oauth/register`
- `POST /api/oauth/token`
- `GET /api/oauth/authorize` redirects to `/oauth/consent` or to sign-in
- `POST /api/mcp` and `GET /api/mcp`

Authorization code with PKCE S256 is required. The code challenge is stored with the code hash. The token endpoint checks `BASE64URL(SHA256(verifier))` against that challenge, then stores only hashes of the access token and the refresh token. The raw tokens are returned once. A grant row records user id, workspace id, client id, and scopes `board:read` and `board:write`. Write implies read. Access tokens expire in one hour. Refresh tokens expire in 30 days. A refresh rotates the refresh token.

Consent is a page in this app. If there is no session, the visitor goes to the existing email and password form and returns to consent. The member picks a workspace they belong to and approves. The server checks membership before it writes the code. Redirect URIs must match the registered list exactly.

A 401 from `/api/mcp` includes `WWW-Authenticate: Bearer resource_metadata="<origin>/.well-known/oauth-protected-resource"`.

Sign in with X is not built. The consent page does not offer another provider.

### Tool calls stay pure; Convex stores the rows

`handleMcpMessage` keeps taking a token flag and a fleet state and returning the next state. New tools are added there so tests do not need a deployment. OAuth checks live in a pure helper: given a grant record (hash, user, workspace, scopes, expiry, revoked flag) and a tool name, it returns allow, 401, or 403. The Next.js route hashes the bearer token and asks Convex to resolve the grant, run the message, and save the next state.

Ingest tokens map `canWrite` to the same scopes. A read-only ingest token can call read tools on `/api/mcp` and on `/mcp`.

### Board columns and needs-human

Stored statuses gain `backlog`, `approved`, and `waiting_human`. Existing `waiting`, `todo`, `in_progress`, and `done` stay so current snapshots still load. The board maps them:

| Stored | Column |
| --- | --- |
| `todo`, `backlog` | Backlog |
| `approved` | Approved |
| `in_progress` | In progress |
| `waiting`, `waiting_human` | Waiting on human |
| `done` | Done |

If `needsHuman` is set and the task is not done, the card moves to Waiting on human even when the status is in progress. Approving a backlog or todo task sets `approved` and does not change the owner. Answering writes `decision`, clears the needs-human flag, and queues a pending instruction the bot can poll. A human can also queue a free-form instruction.

`claim_task` still refuses to replace another owner and still marks a conflict. A successful claim of a task in backlog, todo, or approved moves it to `in_progress`.

`register_bot` keys the bot from the name (`bot-a` stays `bot-a`). Routines replace that bot's routine rows. `heartbeat` sets status, current task, and last run on that bot only.

MCP-created bots use origin `mcp`. MCP-created tasks use source `mcp`. A replacing fleet ingest keeps those rows and keeps heartbeat fields and needs-human fields on bots the snapshot also contains.

### UI

The shell gains Bots and Connect. The board keeps the org filter and the list toggle. The inbox and Approve sit on the board. On the example snapshot those actions are visible and disabled, the same way sync is disabled. The bots page reads the same fleet view. Connect builds the MCP URL from the page origin and shows a prompt that tells the reader to sign in and pick a workspace.

## Risks / Trade-offs

- [Schema is not pushed] → The UI and routes are in the repo. A live workspace does not gain the new tables until someone runs a dev push later, which this change does not do.
- [Public Convex mutations accept a token hash] → The hash is the credential. The route hashes before the call and does not log the raw token. Guessing a 32-byte token hash is not practical.
- [Two MCP URLs] → Both are documented. Connect shows only `/api/mcp` as the Grok Bot URL.
- [Legacy waiting tasks land in Waiting on human] → That matches the old "waiting on owner" column under the new names. The fleet page still groups status `waiting` as waiting on owner.
- [Dynamic client registration is open] → Redirect URIs are stored and matched exactly. Codes are useless without the PKCE verifier.

## Migration Plan

No deployment step in this change. Rollback is reverting the branch. Existing ingest tokens and the Convex `/mcp` path keep their current behavior.

## Open Questions

None that change the specs. Token lifetimes are one hour and thirty days, chosen so a bot can refresh on its wake schedule.
