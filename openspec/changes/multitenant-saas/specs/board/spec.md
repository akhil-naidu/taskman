# board

## ADDED Requirements

### Requirement: Workspace scope

The board SHALL show tasks and sync actions for the active workspace only.

#### Scenario: Sync stays in the workspace

- **WHEN** a member starts a read-only pull
- **THEN** imported tasks are written to that member's active workspace
- **AND** they do not appear on another workspace's board
