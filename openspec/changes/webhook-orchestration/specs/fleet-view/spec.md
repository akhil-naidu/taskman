# Spec Delta

## ADDED Requirements

### Requirement: Webhook health on the bot row

Each bot row SHALL show whether the bot is the orchestrator, whether it has a webhook, the last delivery time, the last delivery error, and the relay status.

#### Scenario: Delivered webhook

- **WHEN** bot-a has a webhook and a successful delivery
- **THEN** the bot row shows the last delivery time
- **AND** the row does not show a webhook URL

#### Scenario: Undelivered webhook

- **WHEN** bot-b's last delivery is undelivered
- **THEN** the bot row shows the last error and an undelivered relay status

#### Scenario: Orchestrator role

- **WHEN** a bot's role is orchestrator
- **THEN** the bot row shows that role
