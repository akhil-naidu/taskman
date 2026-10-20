"use client";

import { Suspense, useState, useSyncExternalStore } from "react";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";

export default function ConnectPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading…</p>}>
      <Connect />
    </Suspense>
  );
}

function Connect() {
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const [copied, setCopied] = useState(false);
  const url = `${origin}/api/mcp`;
  const prompt = [
    "Add TaskMan as a custom remote MCP server.",
    "",
    `URL: ${url}`,
    "Transport: streamable HTTP",
    "",
    "When asked to sign in, use your TaskMan email and password, then pick the workspace to grant.",
    "Do not paste a token. TaskMan stores only a hash of the OAuth access token.",
    "",
    "A workspace ingest token from Connections also works as Authorization: Bearer on this URL.",
    "The same bearer token still works on the Convex HTTP path POST /mcp.",
  ].join("\n");

  return (
    <Shell current="connect">
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-base font-semibold">Connect a Grok Bot</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste this URL into Grok Bot as a custom remote MCP server. The connection is for your account. You choose the workspace on the consent page.
        </p>
        <p className="mt-4 text-sm font-medium">MCP URL</p>
        <p className="mt-1 break-all rounded-md border border-border bg-card px-3 py-2 font-mono text-xs">{url}</p>
        <p className="mt-4 text-sm font-medium">Setup prompt</p>
        <textarea readOnly value={prompt} aria-label="Setup prompt" className="mt-1 min-h-48 w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => {
            void navigator.clipboard.writeText(prompt).then(() => setCopied(true));
          }}
        >
          {copied ? "Copied" : "Copy prompt"}
        </Button>
      </main>
    </Shell>
  );
}
