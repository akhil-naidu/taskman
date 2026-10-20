import { Suspense } from "react";
import { Screen } from "@/components/screen";
import { loadExampleSnapshot } from "@/lib/example";

export default function BoardPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-[var(--mu)]">Loading…</p>}>
      <Screen page="board" example={loadExampleSnapshot()} />
    </Suspense>
  );
}
