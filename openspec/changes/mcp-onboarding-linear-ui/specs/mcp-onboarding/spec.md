# Spec Delta

## Purpose

The signed-in member gets a copyable prompt that tells a Grok Bot how to attach TaskMan and file its work. The same prompt stays on the Connect page.

## ADDED Requirements

### Requirement: First workspace visit

A signed-in member SHALL see the setup prompt the first time they open a workspace in this browser. Dismissing the prompt SHALL hide it on later visits to that workspace. A different workspace SHALL show the prompt until that workspace is dismissed.

#### Scenario: First open

- **WHEN** a signed-in member opens a workspace that has not been dismissed in this browser
- **THEN** the setup prompt is shown and can be copied

#### Scenario: Later visit

- **WHEN** the member dismissed the prompt for that workspace and opens it again
- **THEN** the prompt is not shown automatically

#### Scenario: Another workspace

- **WHEN** the member opens a second workspace that has not been dismissed
- **THEN** the prompt is shown for that workspace

### Requirement: Prompt contents

The prompt SHALL include the MCP URL formed as the site origin plus `/api/mcp`. It SHALL tell the bot to add that remote MCP server with OAuth, then register its name, role, description, routines, current open work, items waiting on the human, and memories it chooses to share, and to log its tasks onto the board. It SHALL tell the bot to keep logging tasks and progress after that.

#### Scenario: Reader copies the prompt

- **WHEN** the prompt is shown for a site origin
- **THEN** the text contains that origin followed by `/api/mcp`
- **AND** the text names OAuth, registration, task import, and ongoing progress

### Requirement: Connect page

The Connect page SHALL show the same prompt and SHALL offer a control that copies it.

#### Scenario: Copy from Connect

- **WHEN** a reader opens Connect and copies the prompt
- **THEN** the copied text matches the prompt shown on the page
