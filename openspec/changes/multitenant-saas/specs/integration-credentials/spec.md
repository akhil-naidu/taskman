# integration-credentials

## Purpose

Each workspace connects its own ClickUp, Linear, GitHub, Jira, and Dropbox credentials. Secrets are encrypted per tenant. Nothing in the environment stores a customer integration token.

## ADDED Requirements

### Requirement: Connect from settings

A workspace member SHALL connect ClickUp, Linear, GitHub, Jira, or Dropbox from workspace settings by pasting a token. When that provider's platform OAuth client is configured, the member SHALL also be able to start OAuth. The stored credential SHALL belong to that workspace only.

#### Scenario: Paste a token

- **WHEN** a member saves a ClickUp token for their workspace
- **THEN** later syncs for that workspace use the saved credential
- **AND** another workspace does not see or use it

#### Scenario: OAuth client is not configured

- **WHEN** a member starts OAuth for a provider whose platform client id is unset
- **THEN** the system does not redirect to the provider
- **AND** the member can still paste a token

### Requirement: Encrypted at rest

The system SHALL encrypt the integration secret before writing it. The encryption key SHALL come from the platform environment, not from the repository. A list of credentials SHALL return a hint and SHALL NOT return the secret or the ciphertext.

#### Scenario: Credential is listed

- **WHEN** a member lists the workspace's connections
- **THEN** each saved provider shows a hint
- **AND** the response does not contain the raw token

### Requirement: No integration env tokens

The app and the sync adapters SHALL NOT read `CLICKUP_API_TOKEN`, `GITHUB_TOKEN`, `LINEAR_API_KEY`, `JIRA_API_TOKEN`, or a Dropbox token from the environment. `.env.example` SHALL NOT list those names.

#### Scenario: ClickUp env var is absent

- **WHEN** a workspace has a stored ClickUp credential and the environment has no ClickUp token
- **THEN** a ClickUp pull for that workspace still uses the stored credential
