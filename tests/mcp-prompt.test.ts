import { describe, expect, it } from "vitest";
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
    expect(prompt.toLowerCase()).not.toContain("twitter");
  });

  it("keys dismissal by workspace", () => {
    expect(onboardingStorageKey("ws-1")).toBe("taskman-mcp-onboarding:ws-1");
    expect(onboardingStorageKey("ws-1")).not.toBe(onboardingStorageKey("ws-2"));
  });
});
