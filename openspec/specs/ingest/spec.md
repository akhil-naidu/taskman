# ingest

## Purpose

Ingest accepts one fleet snapshot from outside the app, authenticates it, and upserts bots, routines, runs, tasks, and related rows by stable keys. The app does not read the source machine.

## Requirements

### Requirement: Authenticated snapshot push

The ingest endpoint SHALL accept a JSON snapshot only when the caller presents the shared ingest secret, as `x-taskman-token` or `Authorization: Bearer`. A missing or wrong secret SHALL be rejected. A body that is not a snapshot SHALL be rejected.

#### Scenario: Wrong secret

- **WHEN** a client posts a snapshot with the wrong secret
- **THEN** the snapshot is not stored
- **AND** the response is unauthorized

#### Scenario: Invalid body

- **WHEN** an authorized client posts a body that is not a snapshot
- **THEN** nothing is upserted
- **AND** the response is a bad request

### Requirement: Idempotent upsert

Posting the same snapshot twice SHALL update existing rows by stable key and SHALL NOT create duplicate bots, routines, runs, tasks, or sync links.

#### Scenario: Second identical push

- **WHEN** the same snapshot is accepted twice
- **THEN** the stored counts match one copy of that snapshot

### Requirement: Fail closed at the caps

An ingest that would pass a list cap SHALL fail and SHALL NOT drop rows to fit.

#### Scenario: Too many bots

- **WHEN** a snapshot contains more bots than the cap
- **THEN** the ingest is rejected

### Requirement: Directory normalization

The push script SHALL read a fleet directory of config, pending items, an index, bot profiles, notes, and optional tasks, and SHALL build one snapshot. A dry run SHALL print that snapshot and SHALL NOT post it.

#### Scenario: Dry run

- **WHEN** the push script runs with a dry run against a fixture directory
- **THEN** it prints the snapshot
- **AND** it does not call the ingest endpoint

### Requirement: Waiting items and activity

Checked pending lines SHALL be skipped. Unchecked pending lines and per-bot open lists SHALL become waiting items. Overlapping open items SHALL be kept and marked as a conflict. Dated note lines SHALL become recent activity. Urgency SHALL be high when the text matches the overdue, security, token, rotate, secret, deadline, or urgent cues. Bot status SHALL use the IST calendar day.

#### Scenario: Checked line

- **WHEN** a pending line is checked
- **THEN** it is not a waiting item

#### Scenario: Overlapping open items

- **WHEN** two bots have open items that overlap
- **THEN** both items are kept
- **AND** they are marked as a conflict
