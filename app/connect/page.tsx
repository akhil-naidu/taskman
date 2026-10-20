"use client";

import { Suspense } from "react";
import { McpSetupPrompt, useMcpSetupPrompt } from "@/components/mcp-setup-prompt";
import { Shell } from "@/components/shell";
import { mcpEndpoint } from "@/lib/mcp-prompt";

export default function ConnectPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading…</p>}>
      <Connect />
    </Suspense>
  );
}

function Connect() {
  const { origin } = useMcpSetupPrompt();
  const url = origin ? mcpEndpoint(origin) : "";

  return (
    <Shell current="connect">
      <main className="mx-auto max-w-3xl px-3 py-4 md:px-5">
        <h1 className="text-base font-semibold tracking-tight">Connect a Grok Bot</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste this prompt into the bot. It adds the remote MCP server with OAuth, registers itself, and logs tasks onto this workspace.
        </p>
        <p className="mt-4 text-sm font-medium">MCP URL</p>
        <p className="mt-1 break-all rounded-md border border-border bg-card px-3 py-2 font-mono text-xs">{url}</p>
        <p className="mt-4 text-sm font-medium">Setup prompt</p>
        <div className="mt-1">
          <McpSetupPrompt />
        </div>
      </main>
    </Shell>
  );
}
