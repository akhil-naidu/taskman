# fleet-view

## ADDED Requirements

### Requirement: Workspace scope

The fleet page SHALL show bots, tiles, and waiting items for the active workspace only. A signed-out reader SHALL NOT see another customer's fleet.

#### Scenario: Two workspaces

- **WHEN** a member of workspace A opens the fleet
- **THEN** bots that belong to workspace B are not shown

#### Scenario: Signed out

- **WHEN** a signed-out reader opens the fleet while a Convex URL is configured
- **THEN** they are sent to sign in
- **AND** no workspace rows are rendered
