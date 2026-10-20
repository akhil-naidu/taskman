# ingest

## MODIFIED Requirements

### Requirement: Authenticated snapshot push

The ingest endpoint SHALL accept a JSON snapshot only when the caller presents a workspace ingest token, as `x-taskman-token` or `Authorization: Bearer`. The token SHALL be matched by its hash to one workspace. A missing, unknown, or revoked token SHALL be rejected. A body that is not a snapshot SHALL be rejected. The endpoint SHALL NOT accept a platform-wide shared secret from the environment.

#### Scenario: Wrong secret

- **WHEN** a client posts a snapshot with an unknown token
- **THEN** the snapshot is not stored
- **AND** the response is unauthorized

#### Scenario: Invalid body

- **WHEN** an authorized client posts a body that is not a snapshot
- **THEN** nothing is upserted
- **AND** the response is a bad request

## ADDED Requirements

### Requirement: Workspace scoped push

An accepted push SHALL write bots, routines, runs, tasks, and related rows only on the workspace that owns the ingest token.

#### Scenario: Token for one workspace

- **WHEN** a client presents workspace A's ingest token
- **THEN** the snapshot is stored on workspace A
- **AND** workspace B is unchanged

### Requirement: Hashed ingest token

The system SHALL store only a hash of an ingest token, show the raw token once at creation, and reject the token immediately after revocation.

#### Scenario: Token is created

- **WHEN** a member creates an ingest token
- **THEN** the raw token is returned once
- **AND** a later read of that token record does not include the raw token

#### Scenario: Revoked token

- **WHEN** a member revokes an ingest token and a client presents it
- **THEN** the push is rejected
