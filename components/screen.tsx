"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { currentIstDay } from "@/convex/model/clock";
import { emptyState, planSnapshot } from "@/convex/model/store";
import type { FleetSnapshot, SyncProvider } from "@/convex/model/types";
import { rowsToView } from "@/convex/model/view";
import { Dashboard } from "@/components/dashboard";

function rememberedWorkspace(workspaces: { id: Id<"workspaces"> }[] | undefined): Id<"workspaces"> | "" {
  if (!workspaces || typeof window === "undefined") return "";
  const stored = window.localStorage.getItem("taskman-workspace");
  if (stored && workspaces.some((workspace) => workspace.id === stored)) return stored as Id<"workspaces">;
  return "";
}

export function Screen({ page, example }: { page: "fleet" | "board"; example: FleetSnapshot | null }) {
  if (example) return <ExampleDashboard page={page} snapshot={example} />;
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <p className="p-6 text-sm text-[var(--mu)]">Set NEXT_PUBLIC_CONVEX_URL to load a live fleet.</p>;
  }
  return <LiveDashboard page={page} />;
}

function ExampleDashboard({ page, snapshot }: { page: "fleet" | "board"; snapshot: FleetSnapshot }) {
  const model = useMemo(() => {
    const state = planSnapshot(emptyState(), snapshot, { now: snapshot.generatedAt, replace: true });
    return rowsToView(state, currentIstDay());
  }, [snapshot]);
  return <Dashboard page={page} model={model} mode="example" />;
}

function LiveDashboard({ page }: { page: "fleet" | "board" }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const workspaces = useQuery(api.workspaces.list, isAuthenticated ? {} : "skip");
  const createWorkspace = useMutation(api.workspaces.create);
  const [workspaceId, setWorkspaceId] = useState<Id<"workspaces"> | "">("");
  const [name, setName] = useState("");
  const selected = workspaceId || rememberedWorkspace(workspaces) || workspaces?.[0]?.id || "";
  const model = useQuery(api.fleet.overview, selected ? { workspaceId: selected, now: currentIstDay() } : "skip");
  const pull = useAction(api.sync.pull);
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

  if (isLoading) return <p className="p-6 text-sm text-[var(--mu)]">Loading fleet…</p>;
  if (!isAuthenticated) return <p className="p-6 text-sm text-[var(--mu)]">Sign in to open a workspace.</p>;
  if (workspaces === undefined) return <p className="p-6 text-sm text-[var(--mu)]">Loading fleet…</p>;
  if (!selected) {
    return (
      <form
        className="mx-auto flex max-w-sm flex-col gap-3 px-4 py-10"
        onSubmit={(event) => {
          event.preventDefault();
          void createWorkspace({ name }).then((id) => {
            window.localStorage.setItem("taskman-workspace", id);
            setWorkspaceId(id);
          });
        }}
      >
        <h1 className="text-xl font-semibold">Create a workspace</h1>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Workspace name" className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2" />
        <button type="submit" className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
          Create
        </button>
      </form>
    );
  }
  if (model === undefined) return <p className="p-6 text-sm text-[var(--mu)]">Loading fleet…</p>;
  return <Dashboard page={page} model={model} mode="live" onSync={onSync} syncing={syncing} syncMessage={syncMessage} />;
}
