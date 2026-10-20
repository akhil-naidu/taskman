export function tokensMatch(provided: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const length = Math.max(provided.length, expected.length);
  let diff = provided.length === expected.length ? 0 : 1;
  for (let i = 0; i < length; i += 1) {
    diff |= (provided.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }
  return diff === 0;
}
