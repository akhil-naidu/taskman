# board

## Purpose

The board page shows the same snapshot as the fleet page, arranged as task columns, with conflict markers and read-only sync actions.

## Requirements

### Requirement: Status columns

The board SHALL show tasks in waiting, to do, in progress, and done columns.

#### Scenario: Tasks of each status

- **WHEN** the snapshot contains tasks in more than one status
- **THEN** each task appears in the column for its status
- **AND** an empty column says that it has nothing

### Requirement: Task identity

Each task card SHALL show its title, owner, org, urgency, and conflict state. An external source link SHALL be shown when the task has one.

#### Scenario: Conflicting high-urgency task

- **WHEN** a task is marked conflict and high urgency
- **THEN** the card shows both markers and the owner and org

### Requirement: Shared filters

The board SHALL apply the same org selection and text query as the fleet page.

#### Scenario: Org selected on the fleet page

- **WHEN** the reader opens the board with an org already selected
- **THEN** only tasks from that org are shown

### Requirement: Conflict count

The board SHALL show how many visible tasks are conflicts.

#### Scenario: One visible conflict

- **WHEN** one visible task is a conflict
- **THEN** the board count includes that conflict

### Requirement: Read-only sync actions

On a live board the reader SHALL be able to start a read-only pull for ClickUp, GitHub Issues, Linear, and Jira. The page SHALL show the adapter's message. Sync actions SHALL be unavailable on the example snapshot.

#### Scenario: Example snapshot

- **WHEN** the board is showing the checked-in example
- **THEN** the sync actions do not run

#### Scenario: Live pull returns a message

- **WHEN** a live pull finishes with a message
- **THEN** the board shows that message
