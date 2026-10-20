# Design

## Context

Email and password remain the only Convex Auth provider. `register_bot` already upserts a bot by name and replaces its routines. The Connect page already shows a short MCP URL and a prompt. The board list is a static HTML table. See proposal.md for why this change exists.

Dismissal of the prompt must not require a Convex deploy. Bot profile fields that onboarding needs already exist on the bot row: `description`, `openItems`, and `notes`.

## Goals / Non-Goals

**Goals:**

- One prompt string, built from the site origin, used by the first-visit dialog and Connect.
- `register_bot` stores the onboarding profile. `bulk_import_tasks` upserts tasks for known bots.
- The table view groups, filters, and sorts the same tasks as the five columns.

**Non-Goals:**

- An X or Twitter provider, and any new auth secret.
- A new Convex table for "prompt seen".
- Replacing the column board.

## Decisions

### Prompt text is a pure function of the origin

`mcpSetupPrompt(origin)` returns the copyable text. The browser passes `window.location.origin`, which is the deployed site origin (`SITE_URL` without a trailing slash). Tests assert the URL, OAuth, registration fields, task import, and ongoing logging without rendering React.

Alternative: build the string inside the Connect page only. That would drift from the dialog.

### Dismissal is per workspace in localStorage

The key is `taskman-mcp-onboarding:<workspace id>`. The dialog opens when the member is signed in, a workspace is selected, and that key is absent. Connect always shows the prompt.

Alternative: a `members` field. That needs a schema push, which this change does not do. A new browser will show the prompt again. That is acceptable.

### Profile fields stay on the existing bot row

`register_bot` writes description as given, open work into `openItems`, and memories and waiting items into `notes` with `memory:` and `waiting:` prefixes. Other notes stay. A second call updates the same bot key. Routines still replace that bot's routine rows.

Alternative: new schema arrays. They would not persist until a deploy, so the in-memory model and the stored row would diverge.

### Bulk import upserts by owner and title

The task key is `mcp:` plus a stable hash of owner key and title. A repeat import updates status and the other sent fields. An unknown owner is listed as skipped and is not written. A batch that would pass the existing task cap changes nothing. The tool is in the write set, so a read token is rejected before it runs.

### Table view uses the shadcn table and TanStack Table

The list URL (`view=list`) renders that table. Default grouping is the board column. Filters cover status and owner on top of the existing org and text filters. Sortable columns are title, status, owner, and org. The column board stays the default view.

The shell gets a narrower sidebar, smaller type, and the Inter font from `next/font`. Dark stays the default. Org color stays a small mark.

## Risks / Trade-offs

- [Prefixed notes] → Readers of raw notes see `memory:` and `waiting:`. The tool result returns the parsed lists, and the prompt tells the bot to use the tool fields.
- [localStorage dismissal] → Clearing site data shows the prompt again. Connect remains the permanent copy.
- [Stable task keys] → Two different tasks that share an owner and title collapse to one row. Onboarding titles are expected to be distinct. `create_task` still mints a new key per call.

## Migration Plan

No data migration. Existing bots keep their notes. New imports only add `mcp:` keys. Rollback is reverting the branch. Do not push Convex or Railway.
