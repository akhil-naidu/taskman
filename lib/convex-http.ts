import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export function convexHttp() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
  if (!url) return null;
  return new ConvexHttpClient(url);
}

export { api };
