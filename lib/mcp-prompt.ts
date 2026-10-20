export function mcpEndpoint(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/mcp`;
}

export function resolveSiteOrigin(siteUrl: string | undefined, browserOrigin: string): string {
  const configured = siteUrl?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return browserOrigin.replace(/\/$/, "");
}

export function mcpSetupPrompt(origin: string): string {
  const url = mcpEndpoint(origin);
  return [
    "Add TaskMan as a remote MCP server with OAuth.",
    "",
    `MCP URL: ${url}`,
    "Transport: streamable HTTP",
    "",
    "When the consent page opens, sign in with your TaskMan email and password and pick this workspace. Do not paste a token.",
    "",
    "Then run this one-time onboarding:",
    "1. Call register_bot with your name, role, description, routines, current open work, items waiting on the human, and any memories or learnings you choose to share.",
    "2. Call bulk_import_tasks to log your current tasks onto the board. Statuses are Backlog, Approved, In progress, Waiting on human, and Done.",
    "",
    "After that, keep logging new tasks and progress on this board with create_task, update_task, and report_progress.",
  ].join("\n");
}

export function onboardingStorageKey(workspaceId: string): string {
  return `taskman-mcp-onboarding:${workspaceId}`;
}
