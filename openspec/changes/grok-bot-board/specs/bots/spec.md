# Spec Delta

## Purpose

Gives the human one page of the bots in the active workspace, including whether each bot is awake, when it last checked in, and which task it is on.

## ADDED Requirements

### Requirement: Bot status list

The bots page SHALL list each bot in the active workspace with its status, last heartbeat, and current task. A bot that has never sent a heartbeat SHALL still appear, with an empty heartbeat.

#### Scenario: Two bots

- **WHEN** the workspace has bot-a with a heartbeat and bot-b without one
- **THEN** the page shows both bots
- **AND** bot-a shows its last heartbeat and current task
- **AND** bot-b shows no heartbeat

### Requirement: Workspace boundary

The bots page SHALL show bots from the active workspace only.

#### Scenario: Another workspace has bots

- **WHEN** the reader is viewing one workspace
- **THEN** bots that belong only to another workspace are not listed
