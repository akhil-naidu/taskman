# sync-adapters

## MODIFIED Requirements

### Requirement: ClickUp pull

The ClickUp adapter SHALL fetch tasks with the credential stored for the caller's workspace and the app SHALL upsert them by the ClickUp id on that workspace. List ids or a team id SHALL come from that stored credential. When the workspace has no ClickUp credential, the adapter SHALL report that and SHALL NOT call ClickUp. The adapter SHALL NOT read a ClickUp token from the environment.

#### Scenario: Token is unset

- **WHEN** a ClickUp pull runs for a workspace with no stored ClickUp credential
- **THEN** no ClickUp request is made
- **AND** the result says ClickUp is not connected

#### Scenario: Second pull of the same task

- **WHEN** the same ClickUp task is pulled twice for one workspace
- **THEN** the board keeps one task for that external id
