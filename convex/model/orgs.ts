export const ORG_ORDER = ["Talleflow", "dFlow", "Gatekart", "personal", "fleet"] as const;

export const ORG_COLORS: Record<string, string> = {
  Talleflow: "#16a34a",
  dFlow: "#ea580c",
  Gatekart: "#2563eb",
  personal: "#6b7280",
  fleet: "#6b7280",
};

export function orgColor(org: string, overrides?: Record<string, string>): string {
  return overrides?.[org] || ORG_COLORS[org] || "#8b8b8b";
}

export function orgSlug(org: string): string {
  const slug = org.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "x";
}

export function botKey(name: string): string {
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return key || "bot";
}
