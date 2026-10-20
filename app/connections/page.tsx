"use client";

import { useMutation, useQuery } from "convex/react";
import { Suspense, useState } from "react";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activeWorkspace, useWorkspaceSelection } from "@/components/workspace-selection";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading…</p>}>
      <Shell current="connections">
        {process.env.NEXT_PUBLIC_CONVEX_URL ? (
          <ConnectionsLive />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">Set NEXT_PUBLIC_CONVEX_URL to register a source.</p>
        )}
      </Shell>
    </Suspense>
  );
}

function ConnectionsLive() {
  const workspaces = useQuery(api.workspaces.list, {});
  const { workspaceId } = useWorkspaceSelection();
  const selected = activeWorkspace(workspaces, workspaceId);
  if (workspaces === undefined) return <p className="p-6 text-sm text-muted-foreground">Loading sources…</p>;
  if (!selected) return <p className="p-6 text-sm text-muted-foreground">Create a workspace in Settings before registering a source.</p>;
  return <SourceList workspaceId={selected} />;
}

function SourceList({ workspaceId }: { workspaceId: Id<"workspaces"> }) {
  const tokens = useQuery(api.ingestTokens.list, { workspaceId });
  const create = useMutation(api.ingestTokens.create);
  const revoke = useMutation(api.ingestTokens.revoke);
  const [name, setName] = useState("");
  const [canWrite, setCanWrite] = useState(false);
  const [fresh, setFresh] = useState("");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-base font-semibold">Connections</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Each source gets its own token for this workspace. The raw token is shown once. A write grant lets that token call MCP write tools.
      </p>
      {fresh ? (
        <p className="mt-4 break-all rounded-md border border-border bg-card px-3 py-2 text-sm">
          Copy this token now. It will not be shown again.
          <span className="mt-1 block font-mono text-xs">{fresh}</span>
        </p>
      ) : null}
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(event) => {
          event.preventDefault();
          void create({ workspaceId, name, canWrite }).then((result) => {
            setFresh(result.token);
            setName("");
            setCanWrite(false);
          });
        }}
      >
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Source name" aria-label="Source name" className="sm:max-w-xs" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={canWrite} onChange={(event) => setCanWrite(event.target.checked)} />
          Allow write tools
        </label>
        <Button type="submit" variant="outline" disabled={!name.trim()}>
          Create token
        </Button>
      </form>
      <ul className="mt-4 flex flex-col gap-2">
        {tokens?.map((token) => (
          <li key={token.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <span>
              {token.name} ····{token.hint}
              <span className="ml-2 text-xs text-muted-foreground">{token.canWrite ? "write" : "read-only"}</span>
              {token.revokedAt ? <span className="ml-2 text-xs text-muted-foreground">revoked</span> : null}
            </span>
            {token.revokedAt ? null : (
              <Button type="button" variant="outline" size="sm" onClick={() => void revoke({ workspaceId, tokenId: token.id })}>
                Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
