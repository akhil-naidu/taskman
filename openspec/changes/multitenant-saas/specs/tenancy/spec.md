# tenancy

## Purpose

Accounts and workspaces. A person signs up, creates a workspace, and every fleet read or write is limited to workspaces they belong to.

## ADDED Requirements

### Requirement: Sign up

The system SHALL let a person create an account with an email and a password and sign in again with those credentials. Sign-up SHALL NOT send email.

#### Scenario: New account

- **WHEN** a person submits a new email and a password
- **THEN** they have an account and an authenticated session

#### Scenario: Wrong password

- **WHEN** a person submits the wrong password for an existing email
- **THEN** they do not get a session

### Requirement: Workspace

An authenticated user SHALL be able to create a workspace and SHALL become a member of it. Fleet data SHALL belong to exactly one workspace.

#### Scenario: Create a workspace

- **WHEN** an authenticated user creates a workspace
- **THEN** they are a member of that workspace
- **AND** the workspace has no bots until data is pushed into it

### Requirement: Membership isolation

A query or mutation that reads or writes bots, tasks, routines, runs, sources, sync links, ingest runs, credentials, or ingest tokens SHALL require an authenticated member of that workspace. A non-member SHALL be rejected and SHALL NOT receive the other workspace's rows.

#### Scenario: Member reads their workspace

- **WHEN** a member loads the fleet for their workspace
- **THEN** the result contains only that workspace's rows

#### Scenario: Non-member reads another workspace

- **WHEN** a user requests another workspace's fleet
- **THEN** the request is rejected
- **AND** no rows from that workspace are returned
