# Spec Delta

## MODIFIED Requirements

### Requirement: Status columns

The board SHALL show tasks in Backlog, Approved, In progress, Waiting on human, and Done. A todo or backlog task SHALL appear in Backlog. An approved task SHALL appear in Approved. An in-progress task that does not need a human SHALL appear in In progress. A waiting task, a waiting-on-human task, or any task that is not done and needs a human SHALL appear in Waiting on human. A done task SHALL appear in Done. An empty column SHALL say that it has nothing.

#### Scenario: Tasks of each status

- **WHEN** the snapshot contains tasks in more than one status
- **THEN** each task appears in the column for its status
- **AND** an empty column says that it has nothing

#### Scenario: Legacy to-do task

- **WHEN** a task status is todo
- **THEN** the task appears in the Backlog column

## ADDED Requirements

### Requirement: Needs your decision

The board SHALL list tasks that need a human and have no answer yet. Submitting an answer SHALL store that answer for the owning bot.

#### Scenario: Answer a question

- **WHEN** a task needs a human and offers options
- **THEN** the inbox shows the question and the options
- **AND** choosing an option stores that answer

### Requirement: Approve backlog

A member SHALL be able to move a backlog task to Approved. The owner SHALL NOT change because of that approval.

#### Scenario: Approve one task

- **WHEN** a member approves a backlog task owned by bot-a
- **THEN** the task appears in the Approved column
- **AND** bot-a remains the owner
