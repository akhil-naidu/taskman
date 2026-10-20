# Spec Delta

## ADDED Requirements

### Requirement: Webhook and relay tools

The server SHALL offer `set_bot_webhook`, `get_bot_setup_instructions`, and `list_undelivered` in addition to the existing tools. `set_bot_webhook` and `mark_relayed` SHALL require a write grant or the write scope. `get_bot_setup_instructions` and `list_undelivered` SHALL be available to a valid read token. `get_bot_setup_instructions` SHALL return the same new-bot setup text the orchestrator prompt contains.

#### Scenario: Read token loads setup text

- **WHEN** a read token calls `get_bot_setup_instructions`
- **THEN** the result includes the new-bot setup section
- **AND** that section tells the bot not to create a polling routine

#### Scenario: Read token lists undelivered work

- **WHEN** a read token calls `list_undelivered` and one delivery is undelivered
- **THEN** the result lists that delivery under `deliveries`

#### Scenario: Read token marks a relay

- **WHEN** a token without write calls `mark_relayed`
- **THEN** the call is rejected
- **AND** the delivery stays undelivered

### Requirement: Structured content is an object

Every tool result SHALL set `structuredContent` to a JSON object. A list SHALL be nested under a named field. `structuredContent` SHALL NOT be an array. `get_pending_instructions` SHALL return `{ instructions: [...] }`. `list_bots` SHALL return `{ bots: [...] }`. `list_tasks`, `list_waiting_on_owner`, and `list_conflicts` SHALL return `{ tasks: [...] }`.

#### Scenario: Pending instructions

- **WHEN** a bot calls `get_pending_instructions` and one instruction is pending
- **THEN** `structuredContent` is an object
- **AND** its `instructions` array contains that instruction

#### Scenario: Bot list

- **WHEN** a read token calls `list_bots`
- **THEN** `structuredContent` is an object with a `bots` array
- **AND** `structuredContent` is not an array

### Requirement: Orchestrator onboarding prompt

The setup prompt shown after sign-in SHALL tell the bot that pastes it to act as the orchestrator. It SHALL register itself and every other bot already in the user's fleet. The prompt SHALL include a reusable new-bot setup section.

#### Scenario: Prompt names the orchestrator

- **WHEN** a member copies the setup prompt
- **THEN** the prompt tells that bot to register as the orchestrator
- **AND** the prompt includes a new-bot setup section

### Requirement: Polling belongs to the orchestrator

The orchestrator section SHALL tell that bot to create a webhook routine and a polling routine of about 30 minutes. It SHALL tell that bot to give every other bot a webhook routine only, and SHALL tell it not to create a polling routine for those bots. It SHALL tell the orchestrator to register each webhook URL and to relay undelivered items.

#### Scenario: Other bots are not given a poll

- **WHEN** a member reads the orchestrator section
- **THEN** other bots are given a webhook routine only
- **AND** the orchestrator is told to poll about every 30 minutes and relay undelivered items with SendToAgent
