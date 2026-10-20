const STOP = new Set(["the", "and", "for", "after", "with", "once", "send", "needs", "give", "only"]);

const HIGH = /overdue|security|token|rotate|secret|pat\b|deadline|today|tomorrow|urgent|\b(2[0-9]|3[01]) oct\b/i;

export function stableHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function normalizeTokens(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const tokens = new Set<string>();
  for (const word of words) {
    if (word.length <= 2 || STOP.has(word)) continue;
    tokens.add(word.endsWith("s") ? word.slice(0, -1) : word);
  }
  return tokens;
}

export function tokenOverlap(left: Set<string>, right: Set<string>): boolean {
  if (left.size === 0 || right.size === 0) return false;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared >= 2 && shared / Math.min(left.size, right.size) >= 0.4;
}

export function claimKeyForTitle(title: string): string {
  const tokens = [...normalizeTokens(title)].sort();
  if (tokens.length === 0) return `text:${stableHash(title)}`;
  return `text:${tokens.join(" ")}`;
}

export function urgencyFor(text: string): "high" | "normal" {
  return HIGH.test(text) ? "high" : "normal";
}
