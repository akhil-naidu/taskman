# Spec Delta

## ADDED Requirements

### Requirement: Owner reset

Settings SHALL offer Reset workspace only to the owner of the current workspace. The control SHALL ask the owner to type the workspace name in a confirmation dialog. A member who is not the owner SHALL NOT be able to reset. The system SHALL NOT expose this action as an MCP tool.

#### Scenario: Owner opens reset

- **WHEN** the owner opens Reset workspace
- **THEN** the dialog asks for the workspace name

#### Scenario: Name does not match

- **WHEN** the typed name is not the workspace name
- **THEN** the reset does not run

#### Scenario: Member is not the owner

- **WHEN** a member who is not the owner requests a reset
- **THEN** the reset is rejected

### Requirement: Reset scope

The reset SHALL delete that workspace's tasks, bots, routines, runs, instructions, webhooks, delivery logs, sources, sync links, and ingest runs. It SHALL keep the user account, the workspace, membership, and integration connections. Another workspace SHALL be unchanged.

#### Scenario: Owner confirms the name

- **WHEN** the owner types the current workspace name and confirms
- **THEN** that workspace's tasks, bots, instructions, webhooks, delivery logs, and imported board data are removed
- **AND** the workspace and its integration connections remain

#### Scenario: Other workspace

- **WHEN** the current workspace is reset
- **THEN** rows belonging to another workspace remain
