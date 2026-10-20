# mcp-server

## ADDED Requirements

### Requirement: Workspace isolation

A tool result SHALL include only rows from the workspace that owns the presented bearer token. A tool argument SHALL NOT select a different workspace.

#### Scenario: Token for one workspace

- **WHEN** a token for one workspace calls `list_bots` while another workspace also has bots
- **THEN** the result contains only the token's workspace bots

#### Scenario: Revoked token

- **WHEN** a revoked token calls `list_bots`
- **THEN** the call is rejected
- **AND** no rows are returned

### Requirement: Token write grant

`claim_task`, `update_task_status`, and `report_bot_status` SHALL run only when the presented token's stored grant allows write. A read-only token SHALL be rejected for those tools.

#### Scenario: Read-only token reports status

- **WHEN** a token without the write grant calls `report_bot_status`
- **THEN** the call is rejected
- **AND** the bot's reported status is unchanged
