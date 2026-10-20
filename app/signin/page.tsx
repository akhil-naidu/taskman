"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <p className="p-6 text-sm text-[var(--mu)]">Set NEXT_PUBLIC_CONVEX_URL before signing in.</p>;
  }
  return (
    <Suspense fallback={<p className="p-6 text-sm text-[var(--mu)]">Loading…</p>}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const params = useSearchParams();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    form.set("flow", flow);
    try {
      await signIn("password", form);
      const next = params.get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/signin") ? next : "/");
      router.refresh();
    } catch {
      setError(flow === "signUp" ? "Could not create that account." : "Email or password is wrong.");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-xl font-semibold">{flow === "signUp" ? "Create account" : "Sign in"}</h1>
      <p className="mt-1 text-sm text-[var(--mu)]">Each workspace keeps its own bots, tasks, and tracker credentials.</p>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <label className="text-sm">
          Email
          <input name="email" type="email" required autoComplete="email" className={fieldClass} />
        </label>
        <label className="text-sm">
          Password
          <input name="password" type="password" required minLength={8} autoComplete={flow === "signUp" ? "new-password" : "current-password"} className={fieldClass} />
        </label>
        {error ? <p className="text-sm text-[var(--hi)]">{error}</p> : null}
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Working…" : flow === "signUp" ? "Create account" : "Sign in"}
        </button>
      </form>
      <button
        type="button"
        className="mt-4 text-left text-sm text-[var(--mu)]"
        onClick={() => {
          setFlow(flow === "signUp" ? "signIn" : "signUp");
          setError("");
        }}
      >
        {flow === "signUp" ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </main>
  );
}

const fieldClass = "mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2";
const buttonClass = "rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-2 text-sm disabled:opacity-50";
