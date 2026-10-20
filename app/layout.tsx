import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "taskman",
  description: "Fleet and board for a group of assistant bots",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("taskman-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
