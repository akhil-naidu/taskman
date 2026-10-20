import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { ClientProvider } from "@/components/client-provider";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "taskman",
  description: "Fleet and board for a group of assistant bots",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={cn("dark h-full antialiased", "font-sans", inter.variable)} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("taskman-theme");var dark=t!=="light";document.documentElement.classList.toggle("dark",dark);if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full">
        <Suspense fallback={<p className="p-6 text-sm text-[var(--mu)]">Loading…</p>}>
          <AuthShell>{children}</AuthShell>
        </Suspense>
      </body>
    </html>
  );
}

async function AuthShell({ children }: { children: ReactNode }) {
  const tree = <ClientProvider siteUrl={process.env.SITE_URL ?? ""}>{children}</ClientProvider>;
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return tree;
  return <ConvexAuthNextjsServerProvider>{tree}</ConvexAuthNextjsServerProvider>;
}
