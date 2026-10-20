"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { Suspense, useState } from "react";
import { Shell } from "@/components/shell";
import { activeWorkspace, useWorkspaceSelection } from "@/components/workspace-selection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const PROVIDERS = [
  { id: "clickup", label: "ClickUp", oauth: true, config: true },
  { id: "linear", label: "Linear", oauth: true, config: false },
  { id: "github", label: "GitHub", oauth: true, config: false },
  { id: "jira", label: "Jira", oauth: false, config: true },
  { id: "dropbox", label: "Dropbox", oauth: true, config: false },
] as const;

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading…</p>}>
      <Shell current="settings">
        {process.env.NEXT_PUBLIC_CONVEX_URL ? <SettingsLive /> : <p className="p-6 text-sm text-muted-foreground">Set NEXT_PUBLIC_CONVEX_URL to manage a workspace.</p>}
      </Shell>
    </Suspense>
  );
}

function SettingsLive() {
  const workspaces = useQuery(api.workspaces.list, {});
  const { workspaceId, setWorkspaceId } = useWorkspaceSelection();
  const selected = activeWorkspace(workspaces, workspaceId);
  const current = workspaces?.find((workspace) => workspace.id === selected);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-base font-semibold">Settings</h1>
      <WorkspaceSection workspaces={workspaces} selected={selected} onChoose={setWorkspaceId} />
      {selected ? <CredentialSection workspaceId={selected} /> : null}
      {selected && current ? <DangerZone workspaceId={selected} name={current.name} role={current.role} /> : null}
    </main>
  );
}

function WorkspaceSection({
  workspaces,
  selected,
  onChoose,
}: {
  workspaces: { id: Id<"workspaces">; name: string }[] | undefined;
  selected: Id<"workspaces"> | "";
  onChoose: (id: string) => void;
}) {
  const create = useMutation(api.workspaces.create);
  const { signOut } = useAuthActions();
  const [name, setName] = useState("");

  return (
    <section className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Workspace</h2>
        <button type="button" className={buttonClass} onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
      {workspaces === undefined ? <p className="mt-3 text-sm text-[var(--mu)]">Loading…</p> : null}
      {workspaces && workspaces.length > 0 ? (
        <label className="mt-3 block text-sm">
          Active workspace
          <select
            className={`${fieldClass} mt-1`}
            value={selected}
            onChange={(event) => onChoose(event.target.value)}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void create({ name }).then((id) => {
            setName("");
            onChoose(id);
          });
        }}
      >
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="New workspace name" className={fieldClass} />
        <button type="submit" className={buttonClass}>
          Create
        </button>
      </form>
    </section>
  );
}

function CredentialSection({ workspaceId }: { workspaceId: Id<"workspaces"> }) {
  const credentials = useQuery(api.credentials.list, { workspaceId });
  const save = useMutation(api.credentials.save);
  const remove = useMutation(api.credentials.remove);
  const beginOauth = useMutation(api.credentials.beginOauth);
  const [message, setMessage] = useState("");

  return (
    <section className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <h2 className="text-sm font-semibold">Integrations</h2>
      <p className="mt-1 text-sm text-[var(--mu)]">Tokens are encrypted for this workspace. A saved token is not shown again.</p>
      {message ? <p className="mt-2 text-sm text-[var(--mu)]">{message}</p> : null}
      <div className="mt-4 flex flex-col gap-4">
        {PROVIDERS.map((provider) => {
          const saved = credentials?.find((row) => row.provider === provider.id);
          return (
            <ProviderForm
              key={`${provider.id}:${saved?.config ?? ""}`}
              provider={provider}
              hint={saved?.hint}
              config={saved?.config}
              onSave={async (token, config) => {
                const result = await save({ workspaceId, provider: provider.id, token, config });
                setMessage(`${provider.label} saved. Hint ${result.hint}.`);
              }}
              onRemove={async () => {
                await remove({ workspaceId, provider: provider.id });
                setMessage(`${provider.label} removed.`);
              }}
              onOauth={
                provider.oauth
                  ? async () => {
                      const result = await beginOauth({ workspaceId, provider: provider.id });
                      if (!result.configured) {
                        setMessage(`${provider.label} OAuth is not configured. Paste a token instead.`);
                        return;
                      }
                      window.location.href = result.url;
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
    </section>
  );
}

function ProviderForm({
  provider,
  hint,
  config,
  onSave,
  onRemove,
  onOauth,
}: {
  provider: (typeof PROVIDERS)[number];
  hint?: string;
  config?: string;
  onSave: (token: string, config?: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onOauth?: () => Promise<void>;
}) {
  const savedConfig = readSavedConfig(config);
  const [token, setToken] = useState("");
  const [teamId, setTeamId] = useState(savedConfig.teamId);
  const [listIds, setListIds] = useState(savedConfig.listIds);
  const [baseUrl, setBaseUrl] = useState(savedConfig.baseUrl);
  const [email, setEmail] = useState(savedConfig.email);

  return (
    <form
      className="border-t border-[var(--line)] pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        const nextConfig = provider.config
          ? JSON.stringify({
              ...(teamId ? { teamId } : {}),
              ...(listIds ? { listIds } : {}),
              ...(baseUrl ? { baseUrl } : {}),
              ...(email ? { email } : {}),
            })
          : undefined;
        void onSave(token, nextConfig).then(() => setToken(""));
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{provider.label}</h3>
        <span className="text-xs text-[var(--mu)]">{hint ? `Saved ····${hint}` : "Not connected"}</span>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        <input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste a token" autoComplete="off" className={fieldClass} />
        {provider.id === "clickup" ? (
          <>
            <input value={teamId} onChange={(event) => setTeamId(event.target.value)} placeholder="Team id" className={fieldClass} />
            <input value={listIds} onChange={(event) => setListIds(event.target.value)} placeholder="List ids, comma separated" className={fieldClass} />
          </>
        ) : null}
        {provider.id === "jira" ? (
          <>
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="Site URL" className={fieldClass} />
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Account email" className={fieldClass} />
          </>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={buttonClass} disabled={!token.trim()}>
            Save token
          </button>
          {onOauth ? (
            <button type="button" className={buttonClass} onClick={() => void onOauth()}>
              Connect with OAuth
            </button>
          ) : null}
          {hint ? (
            <button type="button" className={buttonClass} onClick={() => void onRemove()}>
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function readSavedConfig(config?: string) {
  const empty = { teamId: "", listIds: "", baseUrl: "", email: "" };
  if (!config) return empty;
  try {
    const parsed = JSON.parse(config) as { teamId?: string; listIds?: string; baseUrl?: string; email?: string };
    return {
      teamId: parsed.teamId ?? "",
      listIds: parsed.listIds ?? "",
      baseUrl: parsed.baseUrl ?? "",
      email: parsed.email ?? "",
    };
  } catch {
    return empty;
  }
}

function DangerZone({ workspaceId, name, role }: { workspaceId: Id<"workspaces">; name: string; role: string }) {
  const reset = useMutation(api.workspaces.reset);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState("");
  if (role !== "owner") return null;
  const matches = typed.trim() === name;

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <h2 className="text-sm font-semibold">Danger zone</h2>
      <p className="mt-1 text-sm text-[var(--mu)]">
        Reset deletes this workspace&apos;s tasks, bots, instructions, webhooks, delivery logs, and imported board data. The account, this workspace, and integration connections stay.
      </p>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setTyped("");
            setMessage("");
          }
        }}
      >
        <Button type="button" variant="destructive" className="mt-3" onClick={() => setOpen(true)}>
          Reset workspace
        </Button>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Type {name} to delete tasks, bots, instructions, webhooks, delivery logs, and imported board data for this workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={typed} onChange={(event) => setTyped(event.target.value)} aria-label="Workspace name" autoComplete="off" />
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!matches}
              onClick={() => {
                void reset({ workspaceId, name: typed.trim() })
                  .then(() => {
                    setOpen(false);
                    setTyped("");
                    setMessage("");
                  })
                  .catch(() => setMessage("Reset failed"));
              }}
            >
              Reset workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

const fieldClass = "w-full rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-2 text-sm";
const buttonClass = "rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm disabled:opacity-50";
