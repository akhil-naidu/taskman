# Design

## Context

Fleet, board, and settings already check workspace membership. Ingest tokens are hashed and revocable, but they have no write grant and they are created on the settings page. There is no remote MCP route. The layout is a narrow sidebar of orgs plus a top row of links.

## Goals / Non-Goals

**Goals:**

- A shadcn shell that is dark by default, keyboard-operable, and shared by fleet, board, connections, and settings.
- A list of the same board tasks, selected with `view=list`.
- Connections issues the workspace ingest token and records a write grant.
- `POST /mcp` speaks stateless streamable HTTP. The bearer token is the source token. Tools never accept a workspace id.

**Non-Goals:**

- A Convex or Railway deploy.
- The MCP TypeScript SDK. A Convex HTTP action cannot hold an SSE session open, so the handler is a single JSON-RPC response.
- Write-back to an external tracker.
- A second task model. MCP edits the existing task and bot rows.

## Decisions

- shadcn primitives live in `components/ui`. Product screens compose them. Dark is the default `data-theme`. Org color is a 8px mark.
- The command palette is local. Cmd-K and Ctrl-K open it. Arrow keys move, Enter runs, Escape closes.
- `ingestTokens.canWrite` defaults to false when absent. List responses include the grant and the hint, never the raw token.
- MCP auth reuses that token hash. `GET /mcp` returns 405. A notification returns 202 and an empty body. A request returns `application/json` when the Accept header allows JSON, otherwise one SSE message.
- Missing Origin is allowed for a non-browser connector. A present Origin must match `SITE_URL` or local dev.
- `claim_task` leaves the owner in place when another bot already holds the task, sets `conflict`, and adds the claimant. `report_bot_status` sets `bots.reportedStatus` and does not delete other bots. Ingest keeps a reported status already stored for that bot key.
- The fleet view shows `reportedStatus` when it is set, otherwise the derived status.

## Risks / Trade-offs

- Read-only tokens created before the grant field stay read-only.
- A reported status can disagree with the derived status until the next explicit report. The card shows the reported value.
- Browser callers without a matching Origin are rejected. Grok Bot does not send Origin.
