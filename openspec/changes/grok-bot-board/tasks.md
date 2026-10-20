# Tasks

## 1. OAuth resource

- [x] 1.1 Add protected-resource and authorization-server metadata, dynamic client registration, and authorization code with S256 PKCE — verify: unit tests cover a missing redirect URI, a matching verifier, a mismatched verifier, and that the stored grant has a hash plus user, workspace, and scopes
- [x] 1.2 Add the consent page on the existing email and password sign-in, with a workspace picker — verify: an unsigned visitor is sent to sign-in and the grant mutation requires workspace membership
- [x] 1.3 Serve streamable HTTP at `/api/mcp`, accept OAuth access tokens and workspace ingest tokens, and document both `/api/mcp` and Convex `/mcp` — verify: a missing token is rejected with protected-resource metadata, and the README names both paths

## 2. Bot collaboration

- [x] 2.1 Add `register_bot`, `heartbeat`, `create_task`, `update_task`, `report_progress`, `complete_task`, `list_board`, and `get_task` — verify: unit tests register bot-a, record a heartbeat, create a needs-human task, and list it on the board
- [x] 2.2 Keep `claim_task` exclusive and move a free approved task to in progress — verify: bot-b claiming bot-a's task reports a conflict and leaves the owner, and a free approved claim assigns the caller
- [x] 2.3 Add queued instructions, `get_pending_instructions`, and `ack_instruction`, including an answer from the human — verify: a pending answer is returned once and omitted after ack

## 3. Workspace UI

- [x] 3.1 Show Backlog, Approved, In progress, Waiting on human, and Done, plus the needs-your-decision inbox — verify: a todo task renders in Backlog and an empty column says it has nothing
- [x] 3.2 Add the bots page with status, last heartbeat, and current task — verify: the page lists bot-a and bot-b from the example snapshot and shows no heartbeat when none was sent
- [x] 3.3 Add the Connect page with the MCP URL and a setup prompt — verify: the page shows `/api/mcp`, streamable HTTP, and tells the reader to sign in and pick a workspace

## 4. Later

- [ ] 4.1 Add Sign in with X beside email and password — verify: consent can complete with an X account and email and password still works
- [ ] 4.2 Push this schema to a Convex deployment — verify: not run in this change; no dev or production Convex push and no Railway deploy

## Workflow follow-up

- Archive the change after review.
