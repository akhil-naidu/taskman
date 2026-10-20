"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { Bot, Cable, KanbanSquare, Plug, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { activeWorkspace, useWorkspaceSelection } from "@/components/workspace-selection";

const NAV = [
  { id: "fleet", href: "/", label: "Fleet", icon: Bot },
  { id: "board", href: "/board", label: "Board", icon: KanbanSquare },
  { id: "bots", href: "/bots", label: "Bots", icon: Users },
  { id: "connect", href: "/connect", label: "Connect", icon: Plug },
  { id: "connections", href: "/connections", label: "Connections", icon: Cable },
  { id: "settings", href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Shell({ current, children }: { current: (typeof NAV)[number]["id"]; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function hrefFor(id: (typeof NAV)[number]["id"], view?: "list") {
    const params = new URLSearchParams();
    const org = searchParams.get("org");
    if ((id === "fleet" || id === "board" || id === "bots") && org) params.set("org", org);
    if (id === "board" && view === "list") params.set("view", "list");
    const path = NAV.find((item) => item.id === id)?.href ?? "/";
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  }

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function toggleTheme() {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("taskman-theme", next);
    setOpen(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-border bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-3 py-3">
          <Link href={hrefFor("fleet")} className="px-2 text-sm font-semibold tracking-tight">
            taskman
          </Link>
          <Button type="button" variant="outline" size="xs" onClick={() => setOpen(true)} aria-keyshortcuts="Control+K Meta+K">
            Ctrl K
          </Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:px-2" aria-label="Workspace">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = current === item.id || pathname === item.href;
            return (
              <Link
                key={item.id}
                href={hrefFor(item.id)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60"}`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-sidebar-border px-3 py-3">{process.env.NEXT_PUBLIC_CONVEX_URL ? <WorkspaceSwitcher /> : <p className="px-2 text-xs text-muted-foreground">Example snapshot</p>}</div>
      </aside>
      <div className="min-w-0">{children}</div>
      <CommandDialog open={open} onOpenChange={setOpen} title="Command palette" description="Jump to a page">
        <Command>
          <CommandInput placeholder="Jump to…" />
          <CommandList>
            <CommandEmpty>No matches</CommandEmpty>
            <CommandGroup heading="Go">
              <CommandItem value="fleet" onSelect={() => go(hrefFor("fleet"))}>
                Fleet
              </CommandItem>
              <CommandItem value="board" onSelect={() => go(hrefFor("board"))}>
                Board
              </CommandItem>
              <CommandItem value="board list" onSelect={() => go(hrefFor("board", "list"))}>
                Board list
              </CommandItem>
              <CommandItem value="bots" onSelect={() => go(hrefFor("bots"))}>
                Bots
              </CommandItem>
              <CommandItem value="connect" onSelect={() => go(hrefFor("connect"))}>
                Connect
              </CommandItem>
              <CommandItem value="connections" onSelect={() => go(hrefFor("connections"))}>
                Connections
              </CommandItem>
              <CommandItem value="settings" onSelect={() => go(hrefFor("settings"))}>
                Settings
              </CommandItem>
              <CommandItem value="toggle theme" onSelect={toggleTheme}>
                Toggle theme
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}

function WorkspaceSwitcher() {
  const { isAuthenticated } = useConvexAuth();
  const workspaces = useQuery(api.workspaces.list, isAuthenticated ? {} : "skip");
  const { workspaceId, setWorkspaceId } = useWorkspaceSelection();
  const selected = activeWorkspace(workspaces, workspaceId);
  if (!isAuthenticated) return <p className="px-2 text-xs text-muted-foreground">Sign in to choose a workspace</p>;
  if (!workspaces || workspaces.length === 0) return <p className="px-2 text-xs text-muted-foreground">No workspace yet</p>;
  return (
    <label className="block px-2 text-xs text-muted-foreground">
      Workspace
      <select
        className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
        value={selected}
        aria-label="Active workspace"
        onChange={(event) => setWorkspaceId(event.target.value)}
      >
        {workspaces.map((workspace: { id: Id<"workspaces">; name: string }) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
    </label>
  );
}
