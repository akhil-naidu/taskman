"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Shell } from "@/components/shell";
import { TaskTable } from "@/components/task-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatIst } from "@/convex/model/clock";
import { BOARD_COLUMNS, boardColumn } from "@/convex/model/columns";
import { orgSlug } from "@/convex/model/orgs";
import type { BotView, FleetView, SyncProvider, TaskView } from "@/convex/model/types";
import { orgOptions } from "@/convex/model/view";

const PROVIDERS: { id: SyncProvider; label: string }[] = [
  { id: "clickup", label: "Sync ClickUp" },
  { id: "github", label: "GitHub" },
  { id: "linear", label: "Linear" },
  { id: "jira", label: "Jira" },
];

export function Dashboard({
  page,
  model,
  mode,
  onSync,
  syncing = false,
  syncMessage,
  onApprove,
  onAnswer,
  onQueue,
}: {
  page: "fleet" | "board" | "bots";
  model: FleetView;
  mode: "example" | "live";
  onSync?: (provider: SyncProvider) => void;
  syncing?: boolean;
  syncMessage?: string;
  onApprove?: (key: string) => void;
  onAnswer?: (key: string, answer: string) => void;
  onQueue?: (body: string) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const options = orgOptions(model.bots);
  const requested = searchParams.get("org") ?? "all";
  const selected = requested === "all" || options.some((option) => option.slug === requested) ? requested : "all";
  const needle = query.trim().toLowerCase();

  function chooseOrg(org: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (org === "all") params.delete("org");
    else params.set("org", org);
    const next = params.size ? `${pathname}?${params}` : pathname;
    router.replace(next, { scroll: false });
  }

  const view = searchParams.get("view") === "list" ? "list" : "board";

  function chooseView(next: "board" | "list") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "board") params.delete("view");
    else params.set("view", "list");
    const href = params.size ? `${pathname}?${params}` : pathname;
    router.replace(href, { scroll: false });
  }

  return (
    <Shell current={page}>
      <main className="mx-auto w-full px-3 py-4 md:px-5">
        <header className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight">{page === "fleet" ? "Fleet" : page === "bots" ? "Bots" : "Board"}</h1>
              <p className="text-xs text-muted-foreground">Updated {formatIst(model.generatedAt)}</p>
            </div>
            <div className="md:ml-auto flex flex-col gap-2 sm:flex-row sm:items-center">
              {page === "board" ? (
                <div className="flex gap-1" role="group" aria-label="Board layout">
                  <Button type="button" size="sm" variant={view === "board" ? "secondary" : "outline"} aria-pressed={view === "board"} onClick={() => chooseView("board")}>
                    Board
                  </Button>
                  <Button type="button" size="sm" variant={view === "list" ? "secondary" : "outline"} aria-pressed={view === "list"} onClick={() => chooseView("list")}>
                    Table
                  </Button>
                </div>
              ) : null}
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search bots and tasks"
                aria-label="Search bots and tasks"
                className="w-full sm:w-60"
              />
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto" aria-label="Orgs">
            <OrgButton name="All" count={model.bots.length} color="var(--muted-foreground)" pressed={selected === "all"} onClick={() => chooseOrg("all")} />
            {options.map((option) => (
              <OrgButton
                key={option.slug}
                name={option.name}
                count={option.count}
                color={option.color}
                pressed={selected === option.slug}
                onClick={() => chooseOrg(option.slug)}
              />
            ))}
          </div>
        </header>
        {mode === "example" ? (
          <p className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--mu)]">
            Showing the checked-in example snapshot. Set NEXT_PUBLIC_CONVEX_URL and push a snapshot to see a live fleet.
          </p>
        ) : null}
        {model.truncated ? (
          <p className="mb-4 rounded-xl border border-[var(--hi)] px-3 py-2 text-sm">The list is capped. Narrow the fleet before the next ingest.</p>
        ) : null}
        {model.bots.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-[var(--mu)]">
            No bots yet. Push a snapshot to the ingest endpoint.
          </p>
        ) : page === "fleet" ? (
          <FleetPage model={model} selected={selected} needle={needle} />
        ) : page === "bots" ? (
          <BotsPage model={model} selected={selected} needle={needle} />
        ) : (
          <BoardPage
            model={model}
            selected={selected}
            needle={needle}
            mode={mode}
            view={view}
            onSync={onSync}
            syncing={syncing}
            syncMessage={syncMessage}
            onApprove={onApprove}
            onAnswer={onAnswer}
            onQueue={onQueue}
          />
        )}
      </main>
    </Shell>
  );
}

function FleetPage({ model, selected, needle }: { model: FleetView; selected: string; needle: string }) {
  const bots = model.bots.filter((bot) => orgMatches(bot.org, selected) && matches(needle, bot));
  const waiting = model.tasks.filter((task) => task.status === "waiting" && orgMatches(task.org, selected) && taskMatches(needle, task));
  const groups = groupWaiting(waiting);
  return (
    <>
      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-6">
        <Tile label="Bots" value={model.tiles.bots} />
        <Tile label="Orgs" value={model.tiles.orgs} />
        <Tile label="Known routines" value={model.tiles.routines} />
        <Tile label="Active today" value={model.tiles.active} />
        <Tile label="Waiting" value={model.tiles.waiting} hot />
        <Tile label="High urgency" value={model.tiles.high} hot />
      </section>
      <section className="mb-6 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--hi)_40%,var(--line))] bg-[var(--panel)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-4 py-3">
          <h2 className="text-sm font-semibold">Waiting on owner</h2>
          <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--mu)]">{waiting.length} open</span>
          <span className="rounded-full border border-[color-mix(in_srgb,var(--hi)_50%,transparent)] px-2 py-0.5 text-[11px] text-[var(--hi)]">
            {waiting.filter((task) => task.urgency === "high").length} high
          </span>
        </div>
        {groups.length === 0 ? <p className="px-4 py-6 text-center text-sm text-[var(--mu)]">Nothing waiting</p> : groups.map((group) => <WaitingGroup key={group.owner} group={group} />)}
      </section>
      <p className="mb-3 text-sm text-[var(--mu)]">
        {bots.length === model.bots.length ? `${bots.length} bots` : `${bots.length} of ${model.bots.length} bots`}
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {bots.map((bot) => (
          <BotCard key={bot.key} bot={bot} />
        ))}
      </div>
    </>
  );
}

function BoardPage({
  model,
  selected,
  needle,
  mode,
  view,
  onSync,
  syncing,
  syncMessage,
  onApprove,
  onAnswer,
  onQueue,
}: {
  model: FleetView;
  selected: string;
  needle: string;
  mode: "example" | "live";
  view: "board" | "list";
  onSync?: (provider: SyncProvider) => void;
  syncing: boolean;
  syncMessage?: string;
  onApprove?: (key: string) => void;
  onAnswer?: (key: string, answer: string) => void;
  onQueue?: (body: string) => void;
}) {
  const tasks = model.tasks.filter((task) => orgMatches(task.org, selected) && taskMatches(needle, task));
  const conflicts = tasks.filter((task) => task.conflict).length;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-sm text-[var(--mu)]">
          {tasks.length} tasks{conflicts ? ` · ${conflicts} conflicts` : ""}
        </p>
        <div className="flex flex-wrap gap-2 md:ml-auto">
          {PROVIDERS.map((provider) => (
            <Button
              key={provider.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={mode !== "live" || syncing || !onSync}
              onClick={() => onSync?.(provider.id)}
            >
              {provider.label}
            </Button>
          ))}
        </div>
      </div>
      {syncMessage ? (
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          {syncMessage}
        </p>
      ) : null}
      <DecisionInbox tasks={tasks} onAnswer={onAnswer} />
      <QueueForm onQueue={onQueue} />
      {view === "list" ? <TaskTable tasks={tasks} /> : <TaskColumns tasks={tasks} onApprove={onApprove} />}
    </>
  );
}

function TaskColumns({ tasks, onApprove }: { tasks: TaskView[]; onApprove?: (key: string) => void }) {
  return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        {BOARD_COLUMNS.map(([status, label]) => {
          const column = tasks.filter((task) => boardColumn(task) === status);
          return (
            <section key={status} className="rounded-xl border border-[var(--line)] bg-[var(--panel)]">
              <h2 className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2 text-sm font-semibold">
                {label}
                <span className="text-xs font-normal text-[var(--mu)]">{column.length}</span>
              </h2>
              <div className="space-y-2 p-2">
                {column.length === 0 ? <p className="px-1 py-4 text-center text-xs text-[var(--mu)]">Nothing here</p> : null}
                {column.map((task) => (
                  <TaskCard key={task.key} task={task} onApprove={status === "backlog" ? onApprove : undefined} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
  );
}

function BotCard({ bot }: { bot: BotView }) {
  return (
    <article className="overflow-hidden rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <span className="inline-block size-2 shrink-0 rounded-sm" style={{ background: bot.orgColor }} />
        <span className="grid size-7 place-items-center rounded-md border border-border bg-muted text-xs font-medium">
          {bot.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="font-semibold">{bot.name}</div>
          <div className="text-xs text-[var(--mu)]">
            {bot.org} · {bot.avatarColor} {bot.avatarShape}
          </div>
        </div>
        <StatusPill status={bot.status} />
      </div>
      <p className="mt-3 text-sm">{bot.role}</p>
      <dl className="mt-3 grid grid-cols-[88px_1fr] gap-x-2 gap-y-1 text-[13px]">
        <dt className="text-[var(--mu)]">Wake</dt>
        <dd>{bot.wake}</dd>
        <dt className="text-[var(--mu)]">Routines</dt>
        <dd>{bot.routines.length ? bot.routines.join(", ") : "none found"}</dd>
        <dt className="text-[var(--mu)]">Last run</dt>
        <dd>{bot.lastRun}</dd>
        <dt className="text-[var(--mu)]">Open</dt>
        <dd>{bot.openCount}</dd>
        <dt className="text-[var(--mu)]">Current</dt>
        <dd>{bot.currentWork}</dd>
      </dl>
      <details className="mt-3 border-t border-[var(--line)] pt-2" open>
        <summary className="cursor-pointer text-[13px] text-[var(--mu)]">Recent activity ({bot.activity.length})</summary>
        <ul className="mt-2 list-disc pl-4 text-[13px] text-[var(--mu)]">
          {bot.activity.length === 0 ? <li>No dated notes</li> : bot.activity.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <p className="mt-2 text-[11px] text-[var(--mu)]">Notes: {bot.notes.join(", ") || "none"}</p>
      </details>
    </article>
  );
}

function TaskCard({ task, onApprove }: { task: TaskView; onApprove?: (key: string) => void }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-2.5">
      <p className="text-sm font-medium">{task.title}</p>
      <p className="mt-1 text-xs text-[var(--mu)]">
        <span className="mr-1 inline-block h-2 w-2 rounded-sm" style={{ background: task.orgColor }} />
        {task.ownerLabel} · {task.org}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {task.conflict ? <Badge hot>Conflict</Badge> : null}
        {task.urgency === "high" ? <Badge hot>High</Badge> : null}
        {task.claimants.length > 1 ? <Badge>{task.claimants.join(", ")}</Badge> : null}
        {onApprove ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onApprove(task.key)}>
            Approve
          </Button>
        ) : boardColumn(task) === "backlog" ? (
          <Button type="button" size="sm" variant="outline" disabled>
            Approve
          </Button>
        ) : null}
        {task.externalUrl ? (
          <a className="text-xs text-[var(--ac)] underline" href={task.externalUrl} target="_blank" rel="noreferrer">
            Source
          </a>
        ) : null}
      </div>
    </article>
  );
}

function BotsPage({ model, selected, needle }: { model: FleetView; selected: string; needle: string }) {
  const bots = model.bots.filter((bot) => orgMatches(bot.org, selected) && matches(needle, bot));
  if (bots.length === 0) {
    return <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">No bots yet</p>;
  }
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Bot</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Last heartbeat</th>
            <th className="px-3 py-2 font-medium">Current task</th>
          </tr>
        </thead>
        <tbody>
          {bots.map((bot) => (
            <tr key={bot.key} className="border-b border-border last:border-b-0">
              <td className="px-3 py-2">
                <div className="font-medium">{bot.name}</div>
                <div className="text-xs text-muted-foreground">{bot.org}</div>
              </td>
              <td className="px-3 py-2">{bot.heartbeatStatus || bot.status}</td>
              <td className="px-3 py-2 text-muted-foreground">{bot.lastHeartbeatAt ? formatIst(bot.lastHeartbeatAt) : "No heartbeat"}</td>
              <td className="px-3 py-2">{bot.currentTask || bot.currentWork}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DecisionInbox({ tasks, onAnswer }: { tasks: TaskView[]; onAnswer?: (key: string, answer: string) => void }) {
  const waiting = tasks.filter((task) => task.needsHuman && !task.decision);
  return (
    <section className="mb-4 rounded-md border border-border">
      <h2 className="border-b border-border px-3 py-2 text-sm font-semibold">Needs your decision</h2>
      {waiting.length === 0 ? <p className="px-3 py-4 text-sm text-muted-foreground">Nothing needs a decision</p> : null}
      <ul>
        {waiting.map((task) => (
          <li key={task.key} className="border-b border-border px-3 py-3 last:border-b-0">
            <p className="text-sm font-medium">{task.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{task.question || "This task needs a decision."}</p>
            <AnswerForm task={task} onAnswer={onAnswer} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function AnswerForm({ task, onAnswer }: { task: TaskView; onAnswer?: (key: string, answer: string) => void }) {
  const [text, setText] = useState("");
  if (task.options.length > 0) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {task.options.map((option) => (
          <Button key={option} type="button" size="sm" variant="outline" disabled={!onAnswer} onClick={() => onAnswer?.(task.key, option)}>
            {option}
          </Button>
        ))}
      </div>
    );
  }
  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim()) onAnswer?.(task.key, text.trim());
      }}
    >
      <Input value={text} onChange={(event) => setText(event.target.value)} aria-label={`Answer for ${task.title}`} disabled={!onAnswer} />
      <Button type="submit" size="sm" variant="outline" disabled={!onAnswer || !text.trim()}>
        Send answer
      </Button>
    </form>
  );
}

function QueueForm({ onQueue }: { onQueue?: (body: string) => void }) {
  const [body, setBody] = useState("");
  if (!onQueue) return null;
  return (
    <form
      className="mb-4 flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        if (!body.trim()) return;
        onQueue(body.trim());
        setBody("");
      }}
    >
      <Input value={body} onChange={(event) => setBody(event.target.value)} aria-label="Instruction for a bot" placeholder="Queue an instruction for the next wake" />
      <Button type="submit" variant="outline" disabled={!body.trim()}>
        Queue
      </Button>
    </form>
  );
}

function WaitingGroup({ group }: { group: { owner: string; tasks: TaskView[] } }) {
  return (
    <div className="border-b border-[var(--line)] px-4 py-2 last:border-b-0">
      <p className="flex gap-2 py-1 text-xs text-[var(--mu)]">
        <b className="text-[var(--tx)]">{group.owner}</b>
        <span>{group.tasks.length}</span>
      </p>
      {group.tasks.map((task) => (
        <div key={task.key} className="flex items-start gap-2 py-1.5 text-sm">
          <span className="flex-1">
            {task.title}
            {task.addedDate ? <span className="text-[var(--mu)]"> · {task.addedDate}</span> : null}
          </span>
          <span className={task.urgency === "high" ? "text-[10px] font-semibold tracking-wide text-[var(--hi)] uppercase" : "text-[10px] tracking-wide text-[var(--mu)] uppercase"}>
            {task.urgency}
          </span>
          {task.conflict ? <Badge hot>Conflict</Badge> : null}
        </div>
      ))}
    </div>
  );
}

function groupWaiting(tasks: TaskView[]) {
  const groups = new Map<string, TaskView[]>();
  for (const task of tasks) {
    const list = groups.get(task.ownerLabel) ?? [];
    list.push(task);
    groups.set(task.ownerLabel, list);
  }
  return [...groups.entries()]
    .map(([owner, items]) => ({
      owner,
      tasks: items.slice().sort((a, b) => Number(b.urgency === "high") - Number(a.urgency === "high")),
    }))
    .sort((a, b) => {
      const high = b.tasks.filter((task) => task.urgency === "high").length - a.tasks.filter((task) => task.urgency === "high").length;
      return high || b.tasks.length - a.tasks.length;
    });
}

function orgMatches(org: string, selected: string) {
  return selected === "all" || orgSlug(org) === selected;
}

function matches(needle: string, bot: BotView) {
  if (!needle) return true;
  return `${bot.name} ${bot.role} ${bot.org} ${bot.wake} ${bot.routines.join(" ")} ${bot.activity.join(" ")} ${bot.currentWork}`
    .toLowerCase()
    .includes(needle);
}

function taskMatches(needle: string, task: TaskView) {
  if (!needle) return true;
  return `${task.title} ${task.ownerLabel} ${task.org} ${task.claimants.join(" ")}`.toLowerCase().includes(needle);
}

function OrgButton({
  name,
  count,
  color,
  pressed,
  onClick,
}: {
  name: string;
  count: number;
  color: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-[13px] ${pressed ? "bg-[var(--panel2)] font-medium text-[var(--tx)]" : "text-[var(--mu)]"}`}
    >
      <span className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: color }} />
        {name}
      </span>
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function Tile({ label, value, hot = false }: { label: string; value: number; hot?: boolean }) {
  return (
    <div className={`rounded-xl border bg-[var(--panel)] px-3 py-3 ${hot ? "border-[color-mix(in_srgb,var(--hi)_55%,var(--line))]" : "border-[var(--line)]"}`}>
      <div className={`text-2xl font-semibold tabular-nums ${hot ? "text-[var(--hi)]" : ""}`}>{value}</div>
      <div className="text-xs text-[var(--mu)]">{label}</div>
    </div>
  );
}

function StatusPill({ status }: { status: BotView["status"] }) {
  const color = status === "waiting" ? "var(--hi)" : status === "active" ? "var(--ok)" : status === "routine" ? "var(--ac)" : "var(--mu)";
  return (
    <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--mu)]">
      <i className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {status}
    </span>
  );
}

function Badge({ children, hot = false }: { children: string; hot?: boolean }) {
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${hot ? "bg-[color-mix(in_srgb,var(--hi)_18%,transparent)] text-[var(--hi)]" : "bg-[var(--panel)] text-[var(--mu)]"}`}>
      {children}
    </span>
  );
}
