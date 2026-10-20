# Spec Delta

## Purpose

Bots register on a workspace, open and update tasks, ask the human when they need a decision, claim approved work, and poll instructions the human queued.

## ADDED Requirements

### Requirement: Register a bot

`register_bot` SHALL create or update a bot in the token's workspace from a name, role, org, wake schedule, and routines. A second call with the same name SHALL update that bot and SHALL NOT create a duplicate.

#### Scenario: Bot registers

- **WHEN** a write token calls `register_bot` with a name, role, org, wake schedule, and routines
- **THEN** the workspace lists that bot with those fields

#### Scenario: Same name again

- **WHEN** `register_bot` is called again with the same name and a new role
- **THEN** the existing bot's role changes
- **AND** the workspace still has one bot with that name

### Requirement: Heartbeat

`heartbeat` SHALL record a status, current task, and last run on the named bot, and SHALL leave other bots unchanged.

#### Scenario: One bot reports

- **WHEN** bot-a sends a heartbeat with a status and a current task
- **THEN** bot-a's status, current task, and last run update
- **AND** bot-b is unchanged

### Requirement: Task lifecycle

`create_task` SHALL add a task with an owner bot, a status, and an optional needs-human flag, question, and options. `update_task` SHALL change the named fields of that task. `report_progress` SHALL append a note. `complete_task` SHALL mark the task done.

#### Scenario: Task needs a human

- **WHEN** a bot creates a task with needs-human set, a question, and options
- **THEN** the task stores that question and those options
- **AND** the needs-human flag is set

#### Scenario: Progress and completion

- **WHEN** a bot reports progress and then completes the task
- **THEN** the progress note is stored
- **AND** the task status is done

### Requirement: Board read

`list_board` SHALL return the workspace tasks grouped into Backlog, Approved, In progress, Waiting on human, and Done. `get_task` SHALL return one task from that workspace, including owner, status, and needs-human fields when they are set.

#### Scenario: List the board

- **WHEN** a read token calls `list_board`
- **THEN** each returned task sits in one of those five columns

#### Scenario: Unknown task

- **WHEN** a read token calls `get_task` with a key that is not in the workspace
- **THEN** the tool result says the task was not found

### Requirement: Exclusive claim

`claim_task` SHALL give the task to the claiming bot when it has no owner or the same owner. When another bot already owns it, the call SHALL be rejected, the owner SHALL stay, and the conflict SHALL remain visible.

#### Scenario: Another bot owns the task

- **WHEN** bot-b claims a task that bot-a already owns
- **THEN** the tool result reports a conflict
- **AND** bot-a remains the owner

#### Scenario: Approved task is free

- **WHEN** a write token claims an approved task that has no owner
- **THEN** the claiming bot becomes the owner
- **AND** the task moves to in progress

### Requirement: Instructions

A human SHALL be able to queue an instruction or a decision for the workspace. `get_pending_instructions` SHALL return items that are still pending. `ack_instruction` SHALL mark that item acknowledged so a later poll omits it.

#### Scenario: Bot polls and acknowledges

- **WHEN** a human queues an instruction and a bot calls `get_pending_instructions`
- **THEN** the instruction is in the result
- **AND** after `ack_instruction` a later poll does not include it

#### Scenario: Answer becomes an instruction

- **WHEN** a human answers a needs-human question
- **THEN** a pending instruction carries that answer for the bot
