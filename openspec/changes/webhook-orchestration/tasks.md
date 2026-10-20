# Tasks

## 1. Spec

- [x] 1.1 Add proposal, design, and spec deltas for webhook delivery, relay, structured tool results, and workspace reset — verify: `npx @fission-ai/openspec validate --all --strict`

## 2. Webhook delivery and relay

- [x] 2.1 Encrypt webhook URLs per bot and accept them from `register_bot` and `set_bot_webhook` — verify: `pnpm test` shows the URL is absent from fleet state and round-trips through encryption
- [x] 2.2 POST decision, approval, and instruction events with retry, then mark exhausted deliveries undelivered — verify: `pnpm test` covers a successful post, backoff, and the undelivered state
- [x] 2.3 Add `list_undelivered` and `mark_relayed`, and show orchestrator role, webhook health, and relay status — verify: `pnpm test` relays an undelivered item and the bots page renders those fields

## 3. Orchestrator prompt

- [x] 3.1 Update the setup prompt and `get_bot_setup_instructions` so only the orchestrator polls and other bots get a webhook routine — verify: `pnpm test` checks both sections

## 4. Structured content

- [x] 4.1 Return object `structuredContent` for every tool, including `{ instructions: [...] }` — verify: `pnpm test` rejects array `structuredContent`

## 5. Workspace reset

- [x] 5.1 Add an owner-only Settings danger zone that asks for the workspace name and wipes only that workspace's board data — verify: `pnpm test` keeps another workspace and credentials, and the dialog is present on Settings
