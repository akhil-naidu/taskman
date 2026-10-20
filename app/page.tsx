import { Suspense } from "react";
import { Screen } from "@/components/screen";
import { loadExampleSnapshot } from "@/lib/example";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-[var(--mu)]">Loading…</p>}>
      <Screen page="fleet" example={loadExampleSnapshot()} />
    </Suspense>
  );
}
