"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Id } from "@/convex/_generated/dataModel";

type Selection = {
  workspaceId: string;
  setWorkspaceId: (id: string) => void;
};

const WorkspaceSelectionContext = createContext<Selection | null>(null);

export function WorkspaceSelectionProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceIdState] = useState("");

  function setWorkspaceId(id: string) {
    window.localStorage.setItem("taskman-workspace", id);
    setWorkspaceIdState(id);
  }

  return <WorkspaceSelectionContext.Provider value={{ workspaceId, setWorkspaceId }}>{children}</WorkspaceSelectionContext.Provider>;
}

export function useWorkspaceSelection() {
  const value = useContext(WorkspaceSelectionContext);
  if (!value) throw new Error("Workspace selection is missing");
  return value;
}

export function rememberedWorkspace(workspaces: { id: Id<"workspaces"> }[] | undefined): Id<"workspaces"> | "" {
  if (!workspaces || typeof window === "undefined") return "";
  const stored = window.localStorage.getItem("taskman-workspace");
  if (stored && workspaces.some((workspace) => workspace.id === stored)) return stored as Id<"workspaces">;
  return "";
}

export function activeWorkspace(
  workspaces: { id: Id<"workspaces"> }[] | undefined,
  selectedId: string,
): Id<"workspaces"> | "" {
  const candidates = [selectedId, rememberedWorkspace(workspaces), workspaces?.[0]?.id ?? ""];
  for (const id of candidates) {
    if (id && workspaces?.some((workspace) => workspace.id === id)) return id as Id<"workspaces">;
  }
  return "";
}
