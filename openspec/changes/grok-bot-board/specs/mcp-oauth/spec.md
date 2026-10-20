# Spec Delta

## Purpose

Lets a Grok Bot add TaskMan as a custom remote MCP server. The human signs in with email and password, picks a workspace, and the bot receives a hashed OAuth token for that workspace.

## ADDED Requirements

### Requirement: Protected resource metadata

The app origin SHALL publish OAuth protected-resource metadata for `/api/mcp`. The document SHALL name that URL as the resource and SHALL name this app as its authorization server.

#### Scenario: Discovery document

- **WHEN** a client fetches the protected-resource metadata
- **THEN** the resource is the `/api/mcp` URL on the same origin
- **AND** the authorization server is that origin

### Requirement: Authorization server metadata

The app origin SHALL publish OAuth authorization-server metadata with an authorization endpoint, a token endpoint, a registration endpoint, authorization-code grant, and S256 PKCE.

#### Scenario: Metadata lists PKCE

- **WHEN** a client fetches the authorization-server metadata
- **THEN** the code challenge method list includes S256
- **AND** the grant list includes authorization code

### Requirement: Dynamic client registration

A client SHALL be able to register with a name and at least one absolute redirect URI. The server SHALL return a client id. A registration without a redirect URI SHALL be rejected.

#### Scenario: Client registers

- **WHEN** a client posts a name and an absolute redirect URI
- **THEN** the response includes a client id
- **AND** the stored record does not include a raw access token

#### Scenario: Missing redirect URI

- **WHEN** a client posts a registration without a redirect URI
- **THEN** the registration is rejected

### Requirement: Authorization code and PKCE

The authorization endpoint SHALL require response type code and PKCE S256. The token endpoint SHALL issue a bearer access token only when the code verifier matches the stored challenge. A verifier that does not match SHALL be rejected and SHALL NOT issue a token.

#### Scenario: Matching verifier

- **WHEN** a client exchanges a code with the verifier that matches the challenge
- **THEN** the response includes a bearer access token and a refresh token

#### Scenario: Verifier does not match

- **WHEN** a client exchanges a code with a different verifier
- **THEN** the token endpoint rejects the exchange
- **AND** no access token is issued

### Requirement: Consent and workspace grant

The consent page SHALL use the existing email and password sign-in. The signed-in user SHALL pick one workspace they belong to. The issued token SHALL be stored only as a hash and SHALL be mapped to that user, that workspace, and the granted scopes.

#### Scenario: User grants one workspace

- **WHEN** a signed-in member approves a grant for a workspace
- **THEN** the token record maps to that user and that workspace
- **AND** the raw token is not stored

#### Scenario: Unsigned visitor

- **WHEN** a visitor opens consent without a session
- **THEN** the page asks for email and password
- **AND** no grant is created

### Requirement: Scope enforcement

A token with only the read scope SHALL be rejected for a write tool. A missing, unknown, expired, or revoked token SHALL be rejected before a tool runs.

#### Scenario: Read scope calls a write tool

- **WHEN** a token whose scopes omit write calls a write tool
- **THEN** the call is rejected
- **AND** no row changes

#### Scenario: Revoked access token

- **WHEN** a revoked access token calls a tool
- **THEN** the call is rejected
- **AND** no tool runs

### Requirement: Connect page

The Connect page SHALL show the `/api/mcp` URL for the current origin and a prompt a person can paste to a Grok Bot user. The prompt SHALL name streamable HTTP and SHALL say the human signs in and picks a workspace.

#### Scenario: Reader opens Connect

- **WHEN** a reader opens the Connect page
- **THEN** the page shows the MCP URL
- **AND** the prompt tells the reader not to paste a personal access token
