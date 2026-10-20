"use client";

import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { parseScopes } from "@/convex/model/oauth";
import type { Id } from "@/convex/_generated/dataModel";

export default function ConsentPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading…</p>}>
      {process.env.NEXT_PUBLIC_CONVEX_URL ? <Consent /> : <p className="p-6 text-sm text-muted-foreground">Set NEXT_PUBLIC_CONVEX_URL before granting a workspace.</p>}
    </Suspense>
  );
}

function Consent() {
  const params = useSearchParams();
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const preview = useQuery(api.oauth.clientPreview, clientId ? { clientId, redirectUri } : "skip");
  const workspaces = useQuery(api.workspaces.list, {});
  const createCode = useMutation(api.oauth.createCode);
  const [workspaceId, setWorkspaceId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const scopes = parseScopes(params.get("scope") ?? undefined);
  const selected = workspaceId || workspaces?.[0]?.id || "";

  async function grant() {
    if (!selected || !preview?.redirectOk) return;
    setPending(true);
    setError("");
    try {
      const resource = `${window.location.origin}/api/mcp`;
      const result = await createCode({
        clientId,
        redirectUri,
        codeChallenge: params.get("code_challenge") ?? "",
        scopes,
        resource: params.get("resource") || resource,
        workspaceId: selected as Id<"workspaces">,
        state: params.get("state") ?? "",
      });
      window.location.assign(result.redirect);
    } catch {
      setError("Could not grant that workspace.");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-xl font-semibold">Grant TaskMan</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign-in uses your email and password. Pick the workspace this connection may use.</p>
      {preview === undefined || workspaces === undefined ? <p className="mt-6 text-sm text-muted-foreground">Loading…</p> : null}
      {preview === null ? <p className="mt-6 text-sm">This client is not registered.</p> : null}
      {preview && !preview.redirectOk ? <p className="mt-6 text-sm">That redirect URI is not registered for {preview.name}.</p> : null}
      {preview?.redirectOk ? (
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void grant();
          }}
        >
          <p className="text-sm">
            <span className="text-muted-foreground">Client</span> {preview.name}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Scopes</span> {scopes.join(", ")}
          </p>
          <label className="text-sm">
            Workspace
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2"
              aria-label="Workspace to grant"
              value={selected}
              onChange={(event) => setWorkspaceId(event.target.value)}
            >
              {workspaces?.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
          {workspaces?.length === 0 ? <p className="text-sm text-muted-foreground">Create a workspace before granting access.</p> : null}
          {error ? <p className="text-sm text-[var(--hi)]">{error}</p> : null}
          <Button type="submit" disabled={pending || !selected}>
            {pending ? "Granting…" : "Grant workspace"}
          </Button>
        </form>
      ) : null}
    </main>
  );
}
