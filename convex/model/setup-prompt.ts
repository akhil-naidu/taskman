export function newBotSetupSection(): string {
  return [
    "New bot setup",
    "Use this section for a bot created later. Call get_bot_setup_instructions to read it again.",
    "1. Call register_bot with your name, role, description, routines, current open work, items waiting on the human, and memories you choose to share.",
    "2. Create one webhook-triggered routine. When TaskMan POSTs an event, wake, call get_pending_instructions, do the work, call report_progress, then ack_instruction.",
    "3. Call set_bot_webhook with the webhook URL from that routine.",
    "4. Do not create a polling routine. The orchestrator polls about every 30 minutes and relays undelivered events with SendToAgent when a webhook fails.",
  ].join("\n");
}

export function orchestratorSetupPrompt(mcpUrl: string): string {
  return [
    "Add TaskMan as a remote MCP server with OAuth.",
    "",
    `MCP URL: ${mcpUrl}`,
    "Transport: streamable HTTP",
    "",
    "When the consent page opens, sign in with your TaskMan email and password and pick this workspace. Do not paste a token.",
    "",
    "You are the orchestrator for this workspace.",
    "1. Call register_bot for yourself with role orchestrator, plus your description, routines, current open work, items waiting on the human, and memories you choose to share.",
    "2. Call bulk_import_tasks to log current tasks onto the board. Statuses are Backlog, Approved, In progress, Waiting on human, and Done.",
    "3. Register every other bot already in the user's fleet with register_bot. Do not invent bots.",
    "4. For each other bot, create only a webhook-triggered routine: wake on a TaskMan event, call get_pending_instructions, act, report_progress, and ack_instruction. Do not create a polling routine for that bot. Call set_bot_webhook with that bot's webhook URL.",
    "5. For yourself, create that same webhook-triggered routine and call set_bot_webhook. Also create one polling routine that runs about every 30 minutes.",
    "6. On each webhook wake and on each poll, call get_pending_instructions and do your own work. Then call list_undelivered. For each item, relay it to the target bot with Grok Bot SendToAgent, then call mark_relayed.",
    "7. After that, keep logging new tasks and progress on this board with create_task, update_task, and report_progress.",
    "",
    newBotSetupSection(),
  ].join("\n");
}
