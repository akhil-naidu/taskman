# Tasks

## 1. Setup prompt

- [x] 1.1 Add a pure prompt builder that takes a site origin and returns the MCP URL (`origin` + `/api/mcp`) plus OAuth, registration, task import, and ongoing logging instructions — verify: `pnpm test` covers the URL and those phrases
- [x] 1.2 Show that prompt in a dialog the first time a signed-in member opens a workspace, remember dismissal per workspace in this browser, and show the same prompt with a copy control on Connect — verify: the dialog and Connect both render the builder output, and a dismissed workspace key hides the dialog

## 2. Onboarding tools

- [x] 2.1 Extend `register_bot` to store description, routines, open work, waiting items, and memories on the existing bot, without duplicating the name — verify: `pnpm test` registers bot-a with those fields, updates the role in place, and rejects a read token
- [x] 2.2 Add `bulk_import_tasks` as a write tool that upserts tasks for known bots by owner and title, skips an unknown owner, and leaves the board unchanged when the task cap would be exceeded — verify: `pnpm test` imports two tasks for bot-a, updates one on a second import, skips bot-b when bot-b is absent, and rejects a read token

## 3. Linear-style board

- [x] 3.1 Add the shadcn table primitive and a TanStack data table for the board list, grouped by Backlog, Approved, In progress, Waiting on human, and Done, with status and owner filters and sorting — verify: the table view is selected from the URL, groups those statuses, and the column board remains the other view
- [x] 3.2 Set Inter as the app font and tighten the dark shell: neutral surfaces, compact sidebar, subtle borders — verify: the root layout loads Inter and the sidebar stays reachable on a narrow viewport

## 4. Docs and checks

- [x] 4.1 Document the onboarding prompt, the MCP URL, and `register_bot` / `bulk_import_tasks` in the README. Do not add X login or `AUTH_TWITTER_*` — verify: the README names `/api/mcp`, OAuth, and both tools, and does not name an X developer app
- [x] 4.2 Run `npx @fission-ai/openspec validate --all --strict`, `pnpm test`, `pnpm typecheck`, and `pnpm lint` — verify: each command exits 0
