# Spec Delta

## ADDED Requirements

### Requirement: Onboarding registration

`register_bot` SHALL create or update a bot in the token's workspace from a name and role, plus an optional description, routines, open work, items waiting on the human, and memories. A second call with the same name SHALL update that bot and SHALL NOT create a duplicate. A token without write SHALL be rejected and SHALL NOT change the bot.

#### Scenario: Bot registers a profile

- **WHEN** a write token calls `register_bot` with a name, role, description, routines, open work, waiting items, and memories
- **THEN** the workspace lists that bot with those fields
- **AND** the call does not create a second bot

#### Scenario: Same name again

- **WHEN** `register_bot` is called again with the same name and a new role
- **THEN** the existing bot's role changes
- **AND** the workspace still has one bot with that name

#### Scenario: Read token registers a bot

- **WHEN** a token without write calls `register_bot`
- **THEN** the call is rejected
- **AND** no bot is created

### Requirement: Bulk task import

`bulk_import_tasks` SHALL add or update tasks for bots that already exist in the workspace. Each task SHALL keep the owner, org, and status that were sent. A title that already exists for that owner SHALL update that task instead of adding a duplicate. A token without write SHALL be rejected and SHALL NOT change tasks. A task whose owner is not in the workspace SHALL be skipped.

#### Scenario: Import two tasks

- **WHEN** a write token imports two tasks for bot-a
- **THEN** both tasks are on the board
- **AND** each keeps its owner and status

#### Scenario: Import the same title again

- **WHEN** the same owner and title are imported again with a new status
- **THEN** the workspace still has one task with that title and owner
- **AND** the status is the new status

#### Scenario: Unknown owner

- **WHEN** a task names an owner that is not in the workspace
- **THEN** that task is not written
- **AND** the result says the owner was skipped

#### Scenario: Read token imports tasks

- **WHEN** a token without write calls `bulk_import_tasks`
- **THEN** the call is rejected
- **AND** no task is created
