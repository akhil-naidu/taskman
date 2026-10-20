# connections

## Purpose

A connection is a registered bot or fleet source with its own ingest credential. This capability is part of the product contract. The workspace page that issues tokens is delivered by a later change; these requirements are the behavior that change has to meet.

## Requirements

### Requirement: Per-source credential

The system SHALL let a reader register a named source and SHALL issue that source its own ingest token. Ongoing source pushes SHALL authenticate with that token. The shared ingest secret SHALL NOT be the credential for those ongoing sources.

#### Scenario: A source is registered

- **WHEN** a reader registers a source
- **THEN** the source receives a new token that is distinct from the shared ingest secret
- **AND** a push that presents that token is accepted as that source

### Requirement: Hash at rest

The system SHALL store only a hash of the token. The raw token SHALL be shown once, at creation, and SHALL NOT be readable again.

#### Scenario: Token is created

- **WHEN** a source token is created
- **THEN** the raw token is returned to the creator once
- **AND** the stored record does not contain the raw token

#### Scenario: Token is read back

- **WHEN** a reader loads the source after creation
- **THEN** the raw token is not included

### Requirement: Immediate revocation

A source token SHALL be revocable, and revocation SHALL take effect on the next request.

#### Scenario: Revoked token pushes

- **WHEN** a source token is revoked and then presented to ingest
- **THEN** the push is rejected
- **AND** no rows from that request are written

### Requirement: Source payload

An authenticated source SHALL be able to push its status, routines, runs, and waiting items to the ingest endpoint. That push SHALL NOT remove bots, routines, runs, or tasks that belong to other sources.

#### Scenario: One source pushes status

- **WHEN** one source pushes its bots, routines, runs, and waiting items
- **THEN** those rows are upserted
- **AND** another source's rows remain
