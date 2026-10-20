import { Suspense } from "react";
import { Screen } from "@/components/screen";
import { loadExampleSnapshot } from "@/lib/example";

export default function BotsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-[var(--mu)]">Loading…</p>}>
      <Screen page="bots" example={loadExampleSnapshot()} />
    </Suspense>
  );
}
