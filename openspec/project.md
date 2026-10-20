# taskman

Multi-tenant fleet visibility, box hygiene, task ownership, and read-only tracker sync. Anyone can sign up, create a workspace, and run their own bots and tasks.

## Product

The box outside this app stays the source of truth. A push script normalizes profiles, config, an index, notes, and waiting lists into one snapshot and upserts Convex. The hosted app never reads that machine.

The board shows the fleet and the tasks those bots own. Each task has one owner, one org, and a status. Orgs are a label inside a workspace. The tenant boundary is the workspace: a member cannot read or write another workspace. Hand-offs and waiting states keep history.

Tracker sync is read-only. ClickUp, Linear, GitHub, Jira, and Dropbox credentials are stored encrypted on the workspace. They are not environment variables. GitHub Issues, Linear, and Jira pulls stay reserved until those adapters are implemented. There is no write-back.

Connections and the remote MCP server are specified as capabilities in `openspec/specs/` so later work has a contract. The workspace UI that registers sources and serves the MCP endpoint is a separate change.

## Stack

- Next.js App Router and TypeScript
- Convex for data, queries, mutations, actions, and HTTP actions
- pnpm
- Railway is the later host. This repo does not deploy itself.

## Conventions

- Draft pull requests only. Do not merge, mark a pull request ready for review, push to `master`, or deploy.
- No Railway deploys, no production Convex deploy, and no Railway or Convex setting changes. Local or dev Convex only.
- No paid API calls.
- No real bot names, fleet data, or secrets in the repo, fixtures, commits, pull request text, or logs. Fixtures use `bot-a` and `bot-b`. Name env vars in `.env.example` with empty values.
- Pull request text stays neutral and has no attribution lines.
- Board times are IST. Ingest is authenticated. Upserts use stable keys.
- OpenSpec-first. Read this file, then propose a change before feature code. Implement from that change's `tasks.md`. Keep specs in sync with behavior.
