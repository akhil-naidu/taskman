import { newBotSetupSection, orchestratorSetupPrompt } from "@/convex/model/setupPrompt";

export function mcpEndpoint(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/mcp`;
}

export { newBotSetupSection };

export function resolveSiteOrigin(siteUrl: string | undefined, browserOrigin: string): string {
  const configured = siteUrl?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return browserOrigin.replace(/\/$/, "");
}

export function mcpSetupPrompt(origin: string): string {
  return orchestratorSetupPrompt(mcpEndpoint(origin));
}

export function onboardingStorageKey(workspaceId: string): string {
  return `taskman-mcp-onboarding:${workspaceId}`;
}
