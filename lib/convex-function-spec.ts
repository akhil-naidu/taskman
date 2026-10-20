export const REQUIRED_PUBLIC_FUNCTIONS = ["workspaces:reset"] as const;

export type FunctionMetadata = {
  identifier: string;
  visibility: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function visibilityKind(visibility: unknown): string | undefined {
  if (typeof visibility === "string") return visibility;
  if (isRecord(visibility) && typeof visibility.kind === "string") return visibility.kind;
  return undefined;
}

export function functionAliases(identifier: string): string[] {
  const colon = identifier.lastIndexOf(":");
  if (colon <= 0) return [identifier];
  const modulePath = identifier.slice(0, colon);
  const name = identifier.slice(colon + 1);
  const withoutJs = modulePath.endsWith(".js") ? modulePath.slice(0, -3) : modulePath;
  const withJs = modulePath.endsWith(".js") ? modulePath : `${modulePath}.js`;
  return [`${modulePath}:${name}`, `${withoutJs}:${name}`, `${withJs}:${name}`];
}

export function jsonFromOutput(stdout: string): unknown {
  const start = stdout.indexOf("{");
  if (start < 0) throw new Error("Convex function spec was not JSON");
  return JSON.parse(stdout.slice(start)) as unknown;
}

export function parseFunctionSpec(payload: unknown): FunctionMetadata[] {
  const root = typeof payload === "string" ? jsonFromOutput(payload) : payload;
  if (!isRecord(root) || !Array.isArray(root.functions)) {
    throw new Error("Convex function spec did not include a functions array");
  }
  return root.functions.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.identifier !== "string") return [];
    return [{ identifier: entry.identifier, visibility: entry.visibility }];
  });
}

export function missingPublicFunctions(functions: readonly FunctionMetadata[], required: readonly string[]): string[] {
  const present = new Set<string>();
  for (const entry of functions) {
    const kind = visibilityKind(entry.visibility);
    if (kind !== undefined && kind !== "public") continue;
    for (const alias of functionAliases(entry.identifier)) present.add(alias);
  }
  return required.filter((name) => !present.has(name));
}
