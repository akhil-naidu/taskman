"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useSyncExternalStore } from "react";
import { api } from "@/convex/_generated/api";
import { McpSetupPrompt } from "@/components/mcp-setup-prompt";
import { activeWorkspace, useWorkspaceSelection } from "@/components/workspace-selection";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { onboardingStorageKey } from "@/lib/mcp-prompt";

function subscribeOnboarding(onChange: () => void) {
  window.addEventListener("taskman-onboarding", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("taskman-onboarding", onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function OnboardingPrompt() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return null;
  return <OnboardingGate />;
}

function OnboardingGate() {
  const { isAuthenticated } = useConvexAuth();
  if (!isAuthenticated) return null;
  return <OnboardingDialog />;
}

function OnboardingDialog() {
  const workspaces = useQuery(api.workspaces.list, {});
  const { workspaceId } = useWorkspaceSelection();
  const selected = activeWorkspace(workspaces, workspaceId);
  const storageKey = selected ? onboardingStorageKey(selected) : "";
  const dismissed = useSyncExternalStore(
    subscribeOnboarding,
    () => (storageKey ? window.localStorage.getItem(storageKey) === "seen" : true),
    () => true,
  );
  const open = Boolean(storageKey) && !dismissed;

  function dismiss() {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, "seen");
    window.dispatchEvent(new Event("taskman-onboarding"));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent className="sm:max-w-xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Set up the orchestrator</DialogTitle>
          <DialogDescription>Paste this prompt into the bot that should orchestrate the others. You can open it again from Connect.</DialogDescription>
        </DialogHeader>
        <McpSetupPrompt id="onboarding-mcp-prompt" />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={dismiss}>
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
