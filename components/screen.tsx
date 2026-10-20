"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { currentIstDay } from "@/convex/model/clock";
import { emptyState, planSnapshot } from "@/convex/model/store";
import type { FleetSnapshot, SyncProvider } from "@/convex/model/types";
import { rowsToView } from "@/convex/model/view";
import { Dashboard } from "@/components/dashboard";
import { Shell } from "@/components/shell";
import { activeWorkspace, useWorkspaceSelection } from "@/components/workspace-selection";

export function Screen({ page, example }: { page: "fleet" | "board" | "bots"; example: FleetSnapshot | null }) {
  if (example) return <ExampleDashboard page={page} snapshot={example} />;
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <p className="p-6 text-sm text-[var(--mu)]">Set NEXT_PUBLIC_CONVEX_URL to load a live fleet.</p>;
  }
  return <LiveDashboard page={page} />;
}

function ExampleDashboard({ page, snapshot }: { page: "fleet" | "board" | "bots"; snapshot: FleetSnapshot }) {
  const model = useMemo(() => {
    const state = planSnapshot(emptyState(), snapshot, { now: snapshot.generatedAt, replace: true });
    return rowsToView(state, currentIstDay());
  }, [snapshot]);
  return <Dashboard page={page} model={model} mode="example" />;
}

function LiveDashboard({ page }: { page: "fleet" | "board" | "bots" }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const workspaces = useQuery(api.workspaces.list, isAuthenticated ? {} : "skip");
  const createWorkspace = useMutation(api.workspaces.create);
  const { workspaceId, setWorkspaceId } = useWorkspaceSelection();
  const [name, setName] = useState("");
  const selected = activeWorkspace(workspaces, workspaceId);
  const model = useQuery(api.fleet.overview, selected ? { workspaceId: selected, now: currentIstDay() } : "skip");
  const pull = useAction(api.sync.pull);
  const approve = useMutation(api.board.approve);
  const answer = useMutation(api.board.answer);
  const queue = useMutation(api.board.queue);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>();

  async function onSync(provider: SyncProvider) {
    if (!selected) return;
    setSyncing(true);
    try {
      const result = await pull({ workspaceId: selected, provider });
      setSyncMessage(result.message || `Imported ${result.imported}`);
    } catch {
      setSyncMessage("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (isLoading) return <Shell current={page}><p className="p-6 text-sm text-muted-foreground">Loading fleet…</p></Shell>;
  if (!isAuthenticated) return <Shell current={page}><p className="p-6 text-sm text-muted-foreground">Sign in to open a workspace.</p></Shell>;
  if (workspaces === undefined) return <Shell current={page}><p className="p-6 text-sm text-muted-foreground">Loading fleet…</p></Shell>;
  if (!selected) {
    return (
      <Shell current={page}>
        <form
          className="mx-auto flex max-w-sm flex-col gap-3 px-4 py-10"
          onSubmit={(event) => {
            event.preventDefault();
            void createWorkspace({ name }).then((id) => {
              setWorkspaceId(id);
            });
          }}
        >
          <h1 className="text-xl font-semibold">Create a workspace</h1>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Workspace name" className="rounded-lg border border-border bg-card px-3 py-2" />
          <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm">
            Create
          </button>
        </form>
      </Shell>
    );
  }
  if (model === undefined) return <Shell current={page}><p className="p-6 text-sm text-muted-foreground">Loading fleet…</p></Shell>;
  return (
    <Dashboard
      page={page}
      model={model}
      mode="live"
      onSync={onSync}
      syncing={syncing}
      syncMessage={syncMessage}
      onApprove={(key) => {
        if (!selected) return;
        void approve({ workspaceId: selected, key }).catch(() => setSyncMessage("Could not approve that task"));
      }}
      onAnswer={(key, value) => {
        if (!selected) return;
        void answer({ workspaceId: selected, key, answer: value }).catch(() => setSyncMessage("Could not save that answer"));
      }}
      onQueue={(body, botKey) => {
        if (!selected) return;
        void queue({ workspaceId: selected, body, ...(botKey ? { botKey } : {}) }).catch(() => setSyncMessage("Could not queue that instruction"));
      }}
    />
  );
}
