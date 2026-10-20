# Spec Delta

## ADDED Requirements

### Requirement: Bots without a webhook

The board SHALL indicate each bot that is registered in the workspace and has no webhook.

#### Scenario: One bot has no webhook

- **WHEN** the board lists bot-a with no webhook
- **THEN** the board shows that bot-a has no webhook

### Requirement: Orchestrator and relay status

The board SHALL show which bot is the orchestrator and how many deliveries are waiting to be relayed.

#### Scenario: Undelivered work is waiting

- **WHEN** one delivery is undelivered and a bot's role is orchestrator
- **THEN** the board shows the orchestrator role
- **AND** the board shows that one delivery is undelivered
