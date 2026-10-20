# Proposal

## Why

TaskMan is a multi-tenant product. Each customer signs up, creates a workspace, and sees only that workspace's bots, tasks, and tracker credentials. A platform-wide ClickUp token (or the same pattern for Linear, GitHub, Jira, or Dropbox) cannot represent more than one customer.

## What Changes

- Sign-up and sign-in use Convex Auth. A user creates a workspace and works inside it.
- Every query and mutation that reads or writes fleet data checks workspace membership. A member of one workspace cannot read or write another.
- ClickUp, Linear, GitHub, Jira, and Dropbox credentials are connected in workspace settings. The user pastes a token, or starts OAuth when the platform OAuth client is configured. The secret is encrypted with a platform key and stored on that workspace.
- Integration tokens leave the environment. `.env.example` and the sync code no longer read `CLICKUP_API_TOKEN` or the matching Linear, GitHub, Jira, or Dropbox variables.
- Platform env vars are the Convex deploy key, the Convex Auth secrets, and the encryption key. Optional OAuth client id and secret pairs are platform app credentials, not customer tokens.
- Ingest tokens stay per workspace. They are hashed, shown once, and revocable. They are not a global integration token.

## Capabilities

### New Capabilities

- `tenancy`: Accounts, workspaces, and membership checks on every fleet read and write.
- `integration-credentials`: Per-workspace tracker credentials, encrypted at rest, edited from settings.

### Modified Capabilities

- `ingest`: A push authenticates with a workspace ingest token and writes only that workspace.
- `sync-adapters`: Pulls use the workspace credential. They do not read integration tokens from the environment.
- `fleet-view`: The fleet page shows the active workspace only.
- `board`: The board shows the active workspace only.
- `connections`: A source token belongs to one workspace and cannot push into another.

## Impact

- Convex schema, auth tables, and every public query, mutation, and action that touches fleet data.
- Ingest HTTP route, push script, and sync actions.
- Settings UI for workspace credentials and ingest tokens.
- `.env.example` and the README environment table.
- Dev deployment only. No production Convex deploy and no Railway deploy.

## Out of scope

- The dense shadcn shell, command palette, and remote MCP server. Those stay on the following change and must be workspace-scoped.
- Write-back to ClickUp, GitHub, Linear, or Jira.
- Paid API calls, including email delivery for password reset.
