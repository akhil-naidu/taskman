"use client";

import { useAction, useQuery } from "convex/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { currentIstDay } from "@/convex/model/clock";
import { emptyState, planSnapshot } from "@/convex/model/store";
import type { FleetSnapshot, SyncProvider } from "@/convex/model/types";
import { rowsToView } from "@/convex/model/view";
import { Dashboard } from "@/components/dashboard";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function Screen({ page, example }: { page: "fleet" | "board"; example: FleetSnapshot | null }) {
  if (example) return <ExampleDashboard page={page} snapshot={example} />;
  if (!convexClient) {
    return <p className="p-6 text-sm text-[var(--mu)]">Set NEXT_PUBLIC_CONVEX_URL to load a live fleet.</p>;
  }
  return (
    <ConvexProvider client={convexClient}>
      <LiveDashboard page={page} />
    </ConvexProvider>
  );
}

function ExampleDashboard({ page, snapshot }: { page: "fleet" | "board"; snapshot: FleetSnapshot }) {
  const model = useMemo(() => {
    const state = planSnapshot(emptyState(), snapshot, { now: snapshot.generatedAt, replace: true });
    return rowsToView(state, currentIstDay());
  }, [snapshot]);
  return <Dashboard page={page} model={model} mode="example" />;
}

function LiveDashboard({ page }: { page: "fleet" | "board" }) {
  const model = useQuery(api.fleet.overview, { now: currentIstDay() });
  const pull = useAction(api.sync.pull);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>();

  async function onSync(provider: SyncProvider) {
    setSyncing(true);
    try {
      const result = await pull({ provider });
      setSyncMessage(result.message || `Imported ${result.imported}`);
    } catch {
      setSyncMessage("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (model === undefined) return <p className="p-6 text-sm text-[var(--mu)]">Loading fleet…</p>;
  return <Dashboard page={page} model={model} mode="live" onSync={onSync} syncing={syncing} syncMessage={syncMessage} />;
}
