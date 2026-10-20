# connections

## MODIFIED Requirements

### Requirement: Per-source credential

The system SHALL let a member register a named source on their workspace and SHALL issue that source its own ingest token. A push that presents the token SHALL be stored on that workspace. The token SHALL NOT authorize a push into any other workspace. The shared platform environment SHALL NOT hold an ingest secret for ongoing sources.

#### Scenario: A source is registered

- **WHEN** a member registers a source on their workspace
- **THEN** the source receives a new token
- **AND** a push that presents that token is accepted as that source on that workspace

#### Scenario: Token from another workspace

- **WHEN** a client presents workspace A's source token while trying to write workspace B
- **THEN** the write stays on workspace A or is rejected
- **AND** workspace B does not gain those rows
