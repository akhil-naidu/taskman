# fleet-view

## Purpose

The fleet page is the live view of bots pushed into the app: counts, org filter, bot cards, and waiting items grouped by owner. Times are shown in IST.

## Requirements

### Requirement: Summary tiles

The fleet page SHALL show counts for bots, orgs, known routines, bots active today, waiting items, and high-urgency waiting items.

#### Scenario: Tiles follow the loaded snapshot

- **WHEN** a snapshot with bots, routines, and waiting items is loaded
- **THEN** each tile shows the count derived from that snapshot
- **AND** active today counts only bots whose status is active for the current IST day

### Requirement: Org filter

The fleet page SHALL filter bots and waiting items by org, including an all-orgs choice, and SHALL keep the selection in the page URL.

#### Scenario: One org is selected

- **WHEN** the reader selects an org
- **THEN** bots and waiting items from other orgs are hidden
- **AND** the selection survives a reload of the fleet page

### Requirement: Bot cards

Each visible bot SHALL show its role, wake text, routines, last run, open count, current work, status, and recent activity.

#### Scenario: A bot with routines and open items

- **WHEN** a bot has routines and at least one open item
- **THEN** the card lists those routines and the open count
- **AND** the status is waiting

#### Scenario: Status without open items

- **WHEN** a bot has no open items
- **THEN** the status is active when activity is dated today in IST
- **AND** otherwise routine when the bot has routines
- **AND** otherwise on-demand

### Requirement: Waiting list

The fleet page SHALL group waiting items by owner and SHALL show urgency, with high-urgency items distinguished from normal ones.

#### Scenario: Two owners have waiting items

- **WHEN** waiting items belong to more than one owner
- **THEN** each owner is a separate group
- **AND** a high-urgency item is marked high

### Requirement: Search

The fleet page SHALL narrow bots and waiting items by a text query without dropping the org filter.

#### Scenario: Query matches one bot

- **WHEN** the reader enters text that matches one bot's name, role, or activity
- **THEN** only matching bots and waiting items remain visible

### Requirement: Empty and capped states

The fleet page SHALL explain when no bots are loaded, and SHALL warn when the stored snapshot was capped instead of dropping rows silently.

#### Scenario: Nothing ingested

- **WHEN** the loaded snapshot has no bots
- **THEN** the page tells the reader to push a snapshot

#### Scenario: Snapshot is capped

- **WHEN** the stored fleet hit a list cap
- **THEN** the page shows that the list is capped

### Requirement: Example snapshot

Without a configured Convex URL, the fleet page SHALL render the checked-in example snapshot and SHALL say that it is an example.

#### Scenario: Convex URL is unset

- **WHEN** the browser has no Convex URL
- **THEN** the example snapshot is shown
- **AND** the page states that it is the checked-in example
