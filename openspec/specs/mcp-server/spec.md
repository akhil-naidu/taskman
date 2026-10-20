# mcp-server

## Purpose

Taskman exposes a remote MCP server that a Grok Bot can add as a connector. The server uses streamable HTTP and bearer tokens. Read tools are available by default. Write tools are limited to tokens that were granted write. This capability is specified before the server is implemented.

## Requirements

### Requirement: Streamable HTTP endpoint

The server SHALL expose one HTTP endpoint that accepts MCP JSON-RPC over streamable HTTP. A request SHALL be answered with a JSON-RPC response as `application/json` or as an SSE stream. The server SHALL NOT require a long-lived session.

#### Scenario: Initialize

- **WHEN** a client posts an initialize request with an Accept header that allows JSON and event streams
- **THEN** the server returns an initialize result for this server

#### Scenario: Notification

- **WHEN** a client posts a JSON-RPC notification
- **THEN** the server acknowledges it without a JSON-RPC result body

### Requirement: Bearer auth

A tool call SHALL present `Authorization: Bearer` with a known, unrevoked token. A missing, unknown, or revoked token SHALL be rejected and SHALL NOT run a tool.

#### Scenario: Missing token

- **WHEN** a client calls a tool without a bearer token
- **THEN** the server rejects the call
- **AND** no tool runs

### Requirement: Read tools by default

A valid token SHALL be able to call `list_bots`, `get_bot`, `list_tasks`, `get_task`, `list_waiting_on_owner`, and `list_conflicts` without a write grant.

#### Scenario: List bots

- **WHEN** a read token calls `list_bots`
- **THEN** the server returns the bots in the current snapshot

#### Scenario: Filter tasks

- **WHEN** a read token calls `list_tasks` with an org, owner, and status
- **THEN** only tasks that match all provided filters are returned

#### Scenario: Unknown bot

- **WHEN** a read token calls `get_bot` with a key that is not in the snapshot
- **THEN** the tool result says the bot was not found

### Requirement: Write tools are scoped

`claim_task`, `update_task_status`, and `report_bot_status` SHALL run only when the token was granted write. A read-only token SHALL be rejected for those tools and SHALL NOT change stored rows.

#### Scenario: Read token claims a task

- **WHEN** a token without write calls `claim_task`
- **THEN** the call is rejected
- **AND** the task owner is unchanged

### Requirement: Claim conflict

`claim_task` SHALL detect when another owner already holds the task. The system SHALL NOT replace that owner. The conflict SHALL be visible to `list_conflicts`.

#### Scenario: Another owner holds the task

- **WHEN** a write token claims a task whose owner is a different bot
- **THEN** the tool result reports a conflict
- **AND** the existing owner remains
- **AND** `list_conflicts` includes that task

#### Scenario: Task has no owner

- **WHEN** a write token claims a task with no owner
- **THEN** the task owner becomes the claiming bot

### Requirement: Task fields

Tasks returned by the server SHALL include owner, org, and status. `update_task_status` SHALL change only the status of an existing task. `report_bot_status` SHALL update that bot's reported status without deleting other bots.

#### Scenario: Status update

- **WHEN** a write token sets a task status to done
- **THEN** that task's status is done
- **AND** its owner and org stay the same

### Requirement: Connector instructions

The project README SHALL document the endpoint path, streamable HTTP transport, and bearer token header a Grok Bot uses to add this server.

#### Scenario: Reader follows the README

- **WHEN** a reader looks up how to connect a Grok Bot
- **THEN** the README names the MCP path, the transport, and the Authorization header
