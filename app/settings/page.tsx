"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
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
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <p className="p-6 text-sm text-[var(--mu)]">Set NEXT_PUBLIC_CONVEX_URL to manage a workspace.</p>;
  }
  return <SettingsLive />;
}

function SettingsLive() {
  const workspaces = useQuery(api.workspaces.list, {});
  const [workspaceId, setWorkspaceId] = useState<Id<"workspaces"> | "">("");
  const selected = workspaceId || rememberedWorkspace(workspaces) || workspaces?.[0]?.id || "";

  function choose(id: Id<"workspaces">) {
    setWorkspaceId(id);
    window.localStorage.setItem("taskman-workspace", id);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" className="text-sm text-[var(--mu)]">
          Fleet
        </Link>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>
      <WorkspaceSection workspaces={workspaces} selected={selected} onChoose={choose} />
      {selected ? <CredentialSection workspaceId={selected} /> : null}
      {selected ? <IngestSection workspaceId={selected} /> : null}
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
  onChoose: (id: Id<"workspaces">) => void;
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
            onChange={(event) => onChoose(event.target.value as Id<"workspaces">)}
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

function IngestSection({ workspaceId }: { workspaceId: Id<"workspaces"> }) {
  const tokens = useQuery(api.ingestTokens.list, { workspaceId });
  const create = useMutation(api.ingestTokens.create);
  const revoke = useMutation(api.ingestTokens.revoke);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState("");

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <h2 className="text-sm font-semibold">Ingest tokens</h2>
      <p className="mt-1 text-sm text-[var(--mu)]">The raw token is shown once. Pushes that present it write only this workspace.</p>
      {fresh ? (
        <p className="mt-3 break-all rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-2 text-sm">
          Copy this token now. It will not be shown again.
          <span className="mt-1 block font-mono text-xs">{fresh}</span>
        </p>
      ) : null}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void create({ workspaceId, name }).then((result) => {
            setFresh(result.token);
            setName("");
          });
        }}
      >
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Source name" className={fieldClass} />
        <button type="submit" className={buttonClass}>
          Create token
        </button>
      </form>
      <ul className="mt-3 flex flex-col gap-2">
        {tokens?.map((token) => (
          <li key={token.id} className="flex items-center justify-between gap-2 text-sm">
            <span>
              {token.name} ····{token.hint}
              {token.revokedAt ? " · revoked" : ""}
            </span>
            {token.revokedAt ? null : (
              <button type="button" className={buttonClass} onClick={() => void revoke({ workspaceId, tokenId: token.id })}>
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function rememberedWorkspace(workspaces: { id: Id<"workspaces"> }[] | undefined): Id<"workspaces"> | "" {
  if (!workspaces || typeof window === "undefined") return "";
  const stored = window.localStorage.getItem("taskman-workspace");
  if (stored && workspaces.some((workspace) => workspace.id === stored)) return stored as Id<"workspaces">;
  return "";
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

const fieldClass = "w-full rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-2 text-sm";
const buttonClass = "rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm disabled:opacity-50";
