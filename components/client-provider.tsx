"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { WorkspaceSelectionProvider } from "@/components/workspace-selection";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ClientProvider({ children }: { children: ReactNode }) {
  const tree = <WorkspaceSelectionProvider>{children}</WorkspaceSelectionProvider>;
  if (!convexClient) return tree;
  return <ConvexAuthNextjsProvider client={convexClient}>{tree}</ConvexAuthNextjsProvider>;
}
