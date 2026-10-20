# Design

## Context

`register_bot` upserts a bot in the token's workspace. Humans approve tasks, answer decisions, and queue instructions through Convex mutations. MCP tool handlers are pure functions over `FleetState`. Integration secrets use AES-GCM and `TASKMAN_ENCRYPTION_KEY`. `structuredContent` is currently the raw tool value, including arrays. See proposal.md.

## Goals

- Wake the owning bot with a webhook, and keep polling only on the orchestrator.
- After delivery retries fail, queue the event for the orchestrator to relay.
- Keep webhook URLs encrypted and out of fleet state, logs, and tool results.
- Let the owner reset the current workspace's board data from Settings.

## Non-goals

- Creating Grok Bot routines from TaskMan. The setup prompt tells the orchestrator how to create them.
- A polling routine for every bot.
- An MCP tool that resets a workspace.
- Production or dev Convex pushes, Railway deploys, and new secrets.

## Decisions

1. **Webhook URL storage.** `set_bot_webhook` and an optional `webhook_url` on `register_bot` validate the URL (https, or http on localhost) and return it only on the MCP outcome as `webhookUpdates`. The Convex handler encrypts it into `botWebhooks` (ciphertext, iv, hint). The bot row stores `webhookConfigured` and health fields, never the URL.
2. **Events.** One event per human action: `decision_recorded`, `task_approved`, or `instruction_added`. Answering a decision does not also emit `task_approved`. The body is `{ event, taskKey, title, decision, boardUrl }`. `boardUrl` is `SITE_URL` plus `/board`.
3. **Who is woken.** The task owner, or the bot named on the instruction. An instruction with no bot and no task is stored for polling and is not POSTed. A bot with no webhook is not given a delivery row.
4. **Retries.** Up to 4 attempts. The first is immediate. Later attempts wait 30 seconds, 2 minutes, then 10 minutes. The action records status, last error, and attempt count. Exhausted deliveries become `undelivered`.
5. **Relay.** `list_undelivered` returns `{ deliveries: [...] }` for the workspace. The orchestrator prompt tells that bot to SendToAgent each item to the target bot, then call `mark_relayed`. TaskMan does not send the agent-to-agent message itself. Only the orchestrator is told to create a routine that polls about every 30 minutes. Other bots get a webhook routine only.
6. **structuredContent.** Every tool result uses a JSON object. Lists use `bots`, `tasks`, `instructions`, or `deliveries`.
7. **Reset.** `workspaces.reset` requires the owner and the exact workspace name. It deletes that workspace's bots, routines, runs, tasks, sources, sync links, ingest runs, instructions, webhook rows, and delivery rows. It keeps the user, workspace, membership, credentials, ingest tokens, and OAuth rows. The UI is a shadcn AlertDialog. No MCP tool calls it.
8. **Tests.** Dispatch, retry, relay, encryption, structured content, and reset scoping are pure tests. They do not call a live Convex deployment.

## Risks

- A full `writeState` can race a delivery update. Delivery writes load the latest state in the mutation that records the attempt.
- Convex function arguments for the MCP message include the webhook URL the bot just submitted. The stored row is ciphertext. Logs and tool results omit the URL.
- `SITE_URL` unset yields a relative `/board` URL in the payload.

## Migration

New tables and optional bot fields. Existing rows stay valid. No backfill.
