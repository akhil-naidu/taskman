"use client";

import { useSyncExternalStore, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { mcpSetupPrompt, resolveSiteOrigin } from "@/lib/mcp-prompt";
import { useConfiguredSiteUrl } from "@/components/client-provider";

export function useMcpSetupPrompt() {
  const configured = useConfiguredSiteUrl();
  const browserOrigin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const origin = resolveSiteOrigin(configured, browserOrigin);
  return { origin, prompt: origin ? mcpSetupPrompt(origin) : "" };
}

export function McpSetupPrompt({ id = "mcp-setup-prompt" }: { id?: string }) {
  const { prompt } = useMcpSetupPrompt();
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Textarea id={id} readOnly value={prompt} aria-label="Setup prompt" className="min-h-52 font-mono text-xs" />
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!prompt}
          onClick={() => {
            void navigator.clipboard.writeText(prompt).then(() => setCopied(true));
          }}
        >
          {copied ? "Copied" : "Copy prompt"}
        </Button>
      </div>
    </div>
  );
}
