# Proposal

## Why

The fleet and board show one workspace, but a Grok Bot still cannot register itself as a source or call TaskMan as a connector. The pages are also a single column of controls, which is a poor fit for a dense operator workspace.

## What Changes

- Add a dark, dense shadcn shell: sidebar, command palette, and the same tasks as a list or a board.
- Add a Connections page where a member registers a named source for the active workspace. Each source gets its own ingest token. The raw token is shown once. A source can be granted MCP write, or left read-only.
- Serve a stateless streamable HTTP MCP endpoint at `/mcp`. The bearer token is that source token. Every tool reads and writes only the token's workspace.
- Document the connector path, transport, and Authorization header in the README.

## Capabilities

### New Capabilities

- `workspace-shell`: Sidebar navigation, keyboard command palette, and the dark dense frame around fleet, board, connections, and settings.

### Modified Capabilities

- `connections`: Sources are registered on a workspace Connections page, and a token can carry a write grant.
- `mcp-server`: Tool calls are limited to the workspace that owns the bearer token, and write tools follow that token's grant.
- `board`: The same filtered tasks can be shown as a list, with the choice kept in the URL.

## Impact

- Next.js pages and shared shell components, plus shadcn primitives.
- Ingest token records gain a write grant. Bot rows can store a reported status.
- Convex HTTP route `POST /mcp`. No new platform secret and no integration token in the environment.
- README connector section.

## Out of scope

- Pushing schema or functions to a Convex deployment, production deploy, and Railway.
- Write-back to ClickUp, GitHub, Linear, or Jira.
- Paid API calls, email delivery, and a second app beside the fleet board.
