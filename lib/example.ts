import snapshot from "@/fixtures/demo-snapshot.json";
import type { FleetSnapshot } from "@/convex/model/types";

export function loadExampleSnapshot(): FleetSnapshot | null {
  if (process.env.NEXT_PUBLIC_CONVEX_URL) return null;
  return snapshot as FleetSnapshot;
}
