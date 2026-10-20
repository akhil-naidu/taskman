---
name: mcp-server
description: Use when implementing or changing the taskman remote MCP server, streamable HTTP transport, or bearer-token auth. Adapted from the public MCP specification.
---

# MCP server

Adapted from the Model Context Protocol spec, revision 2025-06-18:

- Transports: <https://modelcontextprotocol.io/specification/2025-06-18/basic/transports>
- Authorization: <https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization>

This skill is a project summary of those public pages, not a copy of the spec.

## Transport

- One HTTP endpoint (taskman uses `/mcp`) that implements streamable HTTP.
- Clients POST a single JSON-RPC message. `Accept` lists `application/json` and `text/event-stream`.
- A request is answered with either `Content-Type: application/json` (one JSON-RPC response) or `Content-Type: text/event-stream`.
- A notification or response with no result returns `202` and an empty body.
- Stateless mode is the fit for a Convex HTTP action: do not require `Mcp-Session-Id`. `GET` may return `405` when the server does not hold an SSE stream open.
- Validate `Origin` on browser-facing requests so a random site cannot call the endpoint.

## Auth

- Bearer token in `Authorization`. Reject missing, unknown, and revoked tokens before any tool runs.
- Read tools work for every valid token. Write tools run only when that token was granted write.
- Store a hash of the token. Never log the raw token.

## Tools

Read: `list_bots`, `get_bot`, `list_tasks`, `get_task`, `list_waiting_on_owner`, `list_conflicts`.

Write: `claim_task`, `update_task_status`, `report_bot_status`.

`list_tasks` filters by org, owner, and status when those arguments are present. `claim_task` reports a conflict and leaves the owner in place when another owner already holds the task.

## Docs

The README must tell a reader the path, the transport name (streamable HTTP), and the bearer header used to add the server as a Grok Bot connector.
