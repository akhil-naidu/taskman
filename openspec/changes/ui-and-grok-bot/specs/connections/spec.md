# connections

## ADDED Requirements

### Requirement: Connections page

The system SHALL provide a Connections page for the active workspace. A member SHALL register a named source there. The page SHALL list only sources that belong to that workspace.

#### Scenario: Member opens connections

- **WHEN** a signed-in member opens Connections for their workspace
- **THEN** the page lists that workspace's sources
- **AND** a source from another workspace is not listed

### Requirement: Write grant

A source token SHALL record whether MCP write tools are allowed. A token created without that grant SHALL be read-only. The grant SHALL be visible when the source is listed. The raw token SHALL be returned once at creation and SHALL NOT be readable again.

#### Scenario: Read-only source

- **WHEN** a member creates a source without the write grant
- **THEN** the source is listed as read-only
- **AND** the raw token is returned once

#### Scenario: Write source is read back

- **WHEN** a member creates a source with the write grant and then reloads Connections
- **THEN** the source is listed as allowed to write
- **AND** the raw token is not included
