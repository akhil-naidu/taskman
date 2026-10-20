# Proposal

## Why

A human and their bots need one board. Bots should open tasks, say what they plan to do, ask the human when they are stuck, and post progress. The human should approve backlog items and answer one queue. There is no official Grok sign-in or Grok Bot API, so each bot has to attach TaskMan as a custom remote MCP server, and that connection is account-wide with OAuth discovery on xAI's side.

## What Changes

- Serve the remote MCP server from the Next.js app at `/api/mcp` (streamable HTTP) with OAuth 2.1: protected-resource metadata, authorization-server metadata, dynamic client registration, and authorization code with PKCE.
- Consent uses the existing email and password login. The signed-in user picks the workspace to grant. Access tokens are stored only as hashes, mapped to the user, the workspace, and scopes.
- Keep the Convex `POST /mcp` bearer endpoint from the connections work. Document how it relates to `/api/mcp` so there is not a second undocumented server.
- Add workspace-scoped tools for registering a bot, heartbeats, tasks (including a needs-human question), the board, exclusive claims, and instructions the human queues for the next wake.
- Show the board as Backlog, Approved, In progress, Waiting on human, and Done. Add a needs-your-decision inbox, a bots page, and a Connect page with the MCP URL and a setup prompt.
- Keep email and password as the only sign-in method in this change.

## Capabilities

### New Capabilities

- `mcp-oauth`: OAuth 2.1 discovery, dynamic client registration, authorization code with PKCE, consent, hashed tokens, and the Connect page.
- `bot-collaboration`: Bot registration, heartbeats, task lifecycle, exclusive claims, and instructions humans queue for bots.
- `bots`: A workspace page of bot status, last heartbeat, and current task.

### Modified Capabilities

- `mcp-server`: `/api/mcp` is the OAuth resource. Convex `POST /mcp` stays the workspace-token server and is documented. New tools join the existing bearer tools.
- `board`: Columns become Backlog, Approved, In progress, Waiting on human, and Done, with a needs-your-decision inbox.

## Impact

- Next.js routes for MCP, OAuth metadata, registration, the token endpoint, and consent.
- Convex tables for OAuth clients, authorization codes, hashed tokens, instructions, and extra bot and task fields. All of them are workspace-scoped.
- Shared JSON-RPC handler used by both MCP URLs.
- README connector section and the shell navigation.
- No new paid API and no new platform secret. Sign-in with X is not added.

## Out of scope

- Sign in with X.
- Pushing schema or functions to any Convex deployment, including dev deployments, and any Railway or production deploy.
- Write-back to ClickUp, GitHub, Linear, or Jira.
- A per-bot OAuth grant. One grant covers the workspace the human picks.
- Long-lived MCP sessions. The server stays stateless.
