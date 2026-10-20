# Spec Delta

## MODIFIED Requirements

### Requirement: Streamable HTTP endpoint

The server SHALL expose streamable HTTP at `/api/mcp` on the app origin and SHALL keep `/mcp` for a workspace bearer token. Both SHALL accept one JSON-RPC message and SHALL answer with `application/json` or an SSE stream. Neither SHALL require a long-lived session. The README SHALL name both paths and which credential each accepts.

#### Scenario: Initialize

- **WHEN** a client posts an initialize request to `/api/mcp` with an Accept header that allows JSON and event streams
- **THEN** the server returns an initialize result for this server

#### Scenario: Notification

- **WHEN** a client posts a JSON-RPC notification to `/api/mcp`
- **THEN** the server acknowledges it without a JSON-RPC result body

#### Scenario: Workspace token on the legacy path

- **WHEN** a client posts a tool call to `/mcp` with a workspace bearer token
- **THEN** the server runs the tool in that token's workspace

## ADDED Requirements

### Requirement: OAuth resource

`/api/mcp` SHALL be the OAuth protected resource. A call without a bearer token SHALL be rejected with a challenge that points at the protected-resource metadata. An OAuth access token and a workspace ingest token SHALL both be accepted on `/api/mcp` when they are known and unrevoked.

#### Scenario: Missing token on the app path

- **WHEN** a client calls a tool on `/api/mcp` without a bearer token
- **THEN** the server rejects the call
- **AND** the challenge points at the protected-resource metadata

#### Scenario: Ingest token on the app path

- **WHEN** a client calls a read tool on `/api/mcp` with a valid workspace ingest token
- **THEN** the tool runs in that token's workspace

### Requirement: Collaboration tools

The server SHALL offer `register_bot`, `heartbeat`, `create_task`, `update_task`, `report_progress`, `complete_task`, `list_board`, `claim_task`, `get_pending_instructions`, and `ack_instruction` in addition to the existing read and write tools. Write tools in that list SHALL require a write grant or the write scope.

#### Scenario: Read token registers a bot

- **WHEN** a token without write calls `register_bot`
- **THEN** the call is rejected
- **AND** no bot is created
