"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-[var(--mu)]">The board could not be loaded.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
      >
        Try again
      </button>
    </main>
  );
}
