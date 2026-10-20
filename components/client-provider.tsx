"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { createContext, useContext, type ReactNode } from "react";
import { WorkspaceSelectionProvider } from "@/components/workspace-selection";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;
const SiteOriginContext = createContext("");

export function useConfiguredSiteUrl() {
  return useContext(SiteOriginContext);
}

export function ClientProvider({ children, siteUrl = "" }: { children: ReactNode; siteUrl?: string }) {
  const tree = (
    <SiteOriginContext.Provider value={siteUrl}>
      <WorkspaceSelectionProvider>{children}</WorkspaceSelectionProvider>
    </SiteOriginContext.Provider>
  );
  if (!convexClient) return tree;
  return <ConvexAuthNextjsProvider client={convexClient}>{tree}</ConvexAuthNextjsProvider>;
}
