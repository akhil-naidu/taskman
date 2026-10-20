# Spec Delta

## ADDED Requirements

### Requirement: Encrypted webhook URL

The system SHALL store at most one webhook URL per bot in the current workspace. `register_bot` MAY set it with `webhook_url`, and `set_bot_webhook` SHALL set or replace it. The stored value SHALL be encrypted with the platform encryption key, the same way an integration credential is stored. Fleet state, tool results, and the delivery log SHALL NOT include the URL. A token without write SHALL be rejected and SHALL NOT change the URL.

#### Scenario: Bot registers a webhook

- **WHEN** a write token calls `set_bot_webhook` for bot-a with an https URL
- **THEN** bot-a is marked as having a webhook
- **AND** the stored secret is not the URL
- **AND** the tool result does not include the URL

#### Scenario: Read token sets a webhook

- **WHEN** a token without write calls `set_bot_webhook`
- **THEN** the call is rejected
- **AND** no webhook is stored

### Requirement: Wake the owning bot

When a decision is recorded, a task moves to Approved, or the owner adds an instruction for a bot, the system SHALL POST to that bot's webhook. The JSON body SHALL contain only `event`, `taskKey`, `title`, `decision`, and `boardUrl`. A bot with no webhook SHALL NOT be posted. An instruction with no bot and no task SHALL NOT be posted.

#### Scenario: Decision is recorded

- **WHEN** a human records a decision on a task owned by bot-a and bot-a has a webhook
- **THEN** the system POSTs `decision_recorded` with that task key, title, decision, and board URL

#### Scenario: Task is approved

- **WHEN** a human moves a backlog task owned by bot-a to Approved and bot-a has a webhook
- **THEN** the system POSTs `task_approved` for that task
- **AND** recording a decision does not also POST `task_approved` for the same action

#### Scenario: Bot has no webhook

- **WHEN** a task owned by bot-b is approved and bot-b has no webhook
- **THEN** no delivery is created for bot-b

### Requirement: Retry and delivery log

A failed POST SHALL be retried with backoff up to 4 attempts. The system SHALL keep a delivery log per bot with status, attempts, and the last error. The bot row SHALL show the last delivery time and the last error. After the last failed attempt the delivery SHALL be `undelivered`.

#### Scenario: Delivery fails then succeeds

- **WHEN** the first POST fails and a later POST succeeds
- **THEN** the delivery is `delivered`
- **AND** the bot row shows that delivery time and no error

#### Scenario: Retries are exhausted

- **WHEN** all 4 attempts fail
- **THEN** the delivery is `undelivered`
- **AND** the bot row shows the last error

### Requirement: Orchestrator relay

`list_undelivered` SHALL return `{ deliveries: [...] }` for undelivered items in the current workspace. Each item SHALL include the target bot, event, task key, title, decision, and board URL, and SHALL NOT include a webhook URL. `mark_relayed` SHALL mark one undelivered item `relayed` so a later list omits it. Only the orchestrator bot's setup SHALL include a polling routine of about 30 minutes. Every other bot SHALL be set up with a webhook routine and SHALL NOT be given a polling routine.

#### Scenario: Orchestrator relays one item

- **WHEN** an undelivered delivery for bot-a exists and a write token calls `mark_relayed` for that delivery
- **THEN** `list_undelivered` no longer includes it
- **AND** bot-a shows a relayed status

#### Scenario: Setup distinguishes the orchestrator

- **WHEN** a reader views the setup prompt
- **THEN** the orchestrator section includes a webhook routine and a polling routine of about 30 minutes
- **AND** the new-bot section includes a webhook routine and tells that bot not to create a polling routine
