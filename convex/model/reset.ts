export const WIPE_ON_RESET = [
  "bots",
  "routines",
  "runs",
  "tasks",
  "sources",
  "syncLinks",
  "ingestRuns",
  "instructions",
  "webhookDeliveries",
  "botWebhooks",
] as const;

export type WipeTable = (typeof WIPE_ON_RESET)[number];

export const KEEP_ON_RESET = [
  "workspaces",
  "members",
  "users",
  "credentials",
  "ingestTokens",
  "oauthTokens",
  "oauthClients",
  "oauthCodes",
  "oauthStates",
] as const;

export type ScopedRow = { table: string; workspaceId: string; key: string };

export function applyWorkspaceReset(rows: ScopedRow[], workspaceId: string): ScopedRow[] {
  const wipe = new Set<string>(WIPE_ON_RESET);
  return rows.filter((row) => row.workspaceId !== workspaceId || !wipe.has(row.table));
}

export function resetNameMatches(workspaceName: string, typed: string): boolean {
  return workspaceName === typed.trim();
}

export function resetAllowed(role: string): boolean {
  return role === "owner";
}
