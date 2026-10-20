import { describe, expect, it } from "vitest";
import { newBotSetupSection } from "../convex/model/setup-prompt";
import { mcpEndpoint, mcpSetupPrompt, onboardingStorageKey, resolveSiteOrigin } from "../lib/mcp-prompt";

describe("mcp setup prompt", () => {
  it("builds the MCP URL from the site origin", () => {
    expect(mcpEndpoint("https://taskman.example")).toBe("https://taskman.example/api/mcp");
    expect(mcpEndpoint("https://taskman.example/")).toBe("https://taskman.example/api/mcp");
    expect(resolveSiteOrigin("https://taskman.example/", "http://localhost:3000")).toBe("https://taskman.example");
    expect(resolveSiteOrigin("", "http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("tells the bot to connect with OAuth, register, import tasks, and keep logging", () => {
    const prompt = mcpSetupPrompt("https://taskman.example");
    expect(prompt).toContain("https://taskman.example/api/mcp");
    expect(prompt).toContain("OAuth");
    expect(prompt).toContain("register_bot");
    expect(prompt).toContain("role");
    expect(prompt).toContain("description");
    expect(prompt).toContain("routines");
    expect(prompt).toContain("open work");
    expect(prompt).toContain("waiting on the human");
    expect(prompt).toContain("memories");
    expect(prompt).toContain("bulk_import_tasks");
    expect(prompt).toContain("Backlog");
    expect(prompt).toContain("Approved");
    expect(prompt).toContain("In progress");
    expect(prompt).toContain("Waiting on human");
    expect(prompt).toContain("Done");
    expect(prompt).toContain("report_progress");
    expect(prompt).toContain("orchestrator");
    expect(prompt).toContain("set_bot_webhook");
    expect(prompt).toContain("list_undelivered");
    expect(prompt).toContain("mark_relayed");
    expect(prompt).toContain("SendToAgent");
    expect(prompt).toContain("get_bot_setup_instructions");
    expect(prompt.toLowerCase()).not.toContain("twitter");
    const [orchestrator, laterBot] = prompt.split("New bot setup");
    expect(orchestrator).toContain("about every 30 minutes");
    expect(orchestrator).toContain("Do not create a polling routine for that bot");
    expect(laterBot).toContain("Do not create a polling routine");
    expect(laterBot).not.toContain("Also create one polling routine");
    expect(newBotSetupSection()).toBe(`New bot setup${laterBot}`);
  });

  it("keys dismissal by workspace", () => {
    expect(onboardingStorageKey("ws-1")).toBe("taskman-mcp-onboarding:ws-1");
    expect(onboardingStorageKey("ws-1")).not.toBe(onboardingStorageKey("ws-2"));
  });
});
