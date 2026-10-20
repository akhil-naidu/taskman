# sync-adapters

## Purpose

Sync adapters pull tasks from external trackers into the board. Every adapter is read-only. ClickUp can pull. GitHub Issues, Linear, and Jira are stubs that do not call those APIs.

## Requirements

### Requirement: Pull only

An adapter SHALL expose pull and SHALL NOT create or update tasks in the external tracker.

#### Scenario: A pull is requested

- **WHEN** the board starts a sync
- **THEN** the adapter only reads from the tracker
- **AND** it does not send a create or update to that tracker

### Requirement: ClickUp pull

When a ClickUp token and either list ids or a team id are set, the ClickUp adapter SHALL fetch tasks and the app SHALL upsert them by the ClickUp id. When the token or the target ids are unset, the adapter SHALL report that and SHALL NOT call ClickUp.

#### Scenario: Token is unset

- **WHEN** a ClickUp pull runs without a token
- **THEN** no ClickUp request is made
- **AND** the result says the token is not set

#### Scenario: Second pull of the same task

- **WHEN** the same ClickUp task is pulled twice
- **THEN** the board keeps one task for that external id

### Requirement: Unimplemented trackers

The GitHub Issues, Linear, and Jira adapters SHALL report that they are not implemented and SHALL NOT call those APIs.

#### Scenario: GitHub pull

- **WHEN** a GitHub Issues pull is requested
- **THEN** the result says the adapter is not implemented
- **AND** no GitHub request is made
