# Proposal

## Why

Bots only learn about decisions and instructions when they poll. TaskMan should wake the owning bot when a human records a decision, approves a task, or adds an instruction, and should keep a single orchestrator as the fallback when a webhook cannot be delivered.

## What Changes

- Store one webhook URL per bot, encrypted for that workspace, and POST a small JSON event when a decision is recorded, a task moves to Approved, or the owner adds an instruction for a bot.
- Retry delivery with backoff, keep a delivery log, and show last delivery and last error on the bot row. Polling stays available only on the orchestrator.
- When retries are exhausted, mark the delivery undelivered. The orchestrator lists those items and marks each one relayed after it sends the item to the target bot with Grok Bot SendToAgent.
- The setup prompt makes the bot that pastes it the orchestrator: it registers itself, registers the other bots it already knows, gives those bots a webhook routine only, and gives itself a webhook routine plus a 30 minute poll. A later bot can read the same new-bot section from a tool.
- The board marks bots that have no webhook, and shows the orchestrator role and relay status.
- Tool results that are lists return `structuredContent` as an object with a named array.
- Settings lets the workspace owner reset that workspace's board data after typing the workspace name. The account, workspace, and integration connections stay. There is no MCP reset tool.

## Capabilities

### New Capabilities

- `bot-webhooks`: Encrypted webhook URLs, event delivery, retries, the delivery log, and orchestrator relay of undelivered items.
- `workspace-reset`: Owner-only wipe of the current workspace's board data.

### Modified Capabilities

- `mcp-server`: Webhook and relay tools, orchestrator setup instructions, and object `structuredContent`.
- `board`: Indicator for bots with no webhook, plus orchestrator and relay status.
- `fleet-view`: Bot rows show orchestrator role, webhook health, and relay status.

## Impact

- MCP tools, the post-login setup prompt, Convex bot and delivery storage, the board and bots pages, and Settings.
- Uses the existing `TASKMAN_ENCRYPTION_KEY`. No new platform secret and no tracker env token.
- Out of scope: merging, marking a pull request ready, pushing to `master`, Railway or Convex deploys, paid APIs, an MCP reset tool, and polling routines on bots other than the orchestrator.
