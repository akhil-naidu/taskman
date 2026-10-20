# Proposal

## Why

A person who just signed in still has to invent the instructions a Grok Bot needs to attach TaskMan and file its work. The board list is a plain table, so status, filters, and sort are harder to scan than the column view.

## What Changes

- After the first sign-in into a workspace, show a copyable MCP setup prompt. The same prompt stays on the Connect page.
- The prompt names the MCP URL as `SITE_URL` plus `/api/mcp`, tells the bot to add that remote server with OAuth, run a one-time registration and task import, and keep logging tasks and progress.
- Extend `register_bot` so a bot can record its name, role, description, routines, open work, items waiting on the human, and memories it chooses to share. Add `bulk_import_tasks` to log many tasks onto the board in one call.
- Restyle the workspace with a dark-first neutral palette, the Inter font, tight spacing, and a compact sidebar. Add a shadcn data table (TanStack Table) beside the existing board, with grouping by status, filters, and sorting. Columns stay Backlog, Approved, In progress, Waiting on human, and Done.
- Keep email and password as the only sign-in.

## Capabilities

### New Capabilities

- `mcp-onboarding`: The copyable setup prompt shown on the first visit to a workspace and again from Connect.

### Modified Capabilities

- `mcp-server`: `register_bot` accepts the onboarding profile fields, and `bulk_import_tasks` writes many workspace tasks.
- `board`: The list view is a grouped, filterable, sortable data table of the same tasks as the columns.

## Impact

- Shared prompt helper used by Connect and the post-login dialog.
- MCP tool definitions, the write-tool set, and unit tests. No new platform secret.
- Board list UI, shell density, and the app font. One new table dependency.
- README connector section names the onboarding tools and the prompt.

## Out of scope

- Sign-in with X, an X or Twitter OAuth provider, and any `AUTH_TWITTER_*` environment variable.
- Pushing schema or functions to a Convex deployment, production deploy, and Railway.
- Write-back to ClickUp, GitHub, Linear, or Jira.
- A per-bot OAuth grant. One grant still covers the workspace the human picks.
