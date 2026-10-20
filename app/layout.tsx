import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";
import { ClientProvider } from "@/components/client-provider";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "taskman",
  description: "Fleet and board for a group of assistant bots",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tree = (
    <html lang="en" data-theme="dark" className={cn("dark h-full antialiased", "font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("taskman-theme");var dark=t!=="light";document.documentElement.classList.toggle("dark",dark);if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full">
        <ClientProvider>{children}</ClientProvider>
      </body>
    </html>
  );
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return tree;
  return <ConvexAuthNextjsServerProvider>{tree}</ConvexAuthNextjsServerProvider>;
}
