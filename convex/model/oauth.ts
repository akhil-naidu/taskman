import { randomToken, sha256Hex } from "./secrets";

export const READ_SCOPE = "board:read";
export const WRITE_SCOPE = "board:write";
export const OAUTH_SCOPES = [READ_SCOPE, WRITE_SCOPE] as const;

export const ACCESS_TTL_SECONDS = 60 * 60;
export const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
export const CODE_TTL_SECONDS = 5 * 60;

const WRITE_TOOLS = new Set([
  "claim_task",
  "update_task_status",
  "report_bot_status",
  "register_bot",
  "heartbeat",
  "create_task",
  "update_task",
  "report_progress",
  "complete_task",
  "ack_instruction",
  "bulk_import_tasks",
]);

export type StoredGrant = {
  tokenHash: string;
  userId: string;
  workspaceId: string;
  scopes: string[];
  expiresAt: number;
  revokedAt?: number;
};

export type IngestGrant = {
  workspaceId: string;
  canWrite: boolean;
  revokedAt?: number;
};

export function publicOrigin(request: Request, siteUrl: string | undefined): string {
  const configured = siteUrl?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export function protectedResourceMetadata(origin: string) {
  const base = origin.replace(/\/$/, "");
  return {
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
    scopes_supported: [...OAUTH_SCOPES],
    bearer_methods_supported: ["header"],
  };
}

export function authorizationServerMetadata(origin: string) {
  const base = origin.replace(/\/$/, "");
  return {
    issuer: base,
    authorization_endpoint: `${base}/api/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_basic", "client_secret_post"],
    scopes_supported: [...OAUTH_SCOPES],
  };
}

export function wwwAuthenticate(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`;
}

export function isWriteTool(name: string): boolean {
  return WRITE_TOOLS.has(name);
}

export function parseScopes(value: string | undefined): string[] {
  const requested = (value ?? `${READ_SCOPE} ${WRITE_SCOPE}`).split(/\s+/).filter(Boolean);
  const known = requested.filter((scope) => (OAUTH_SCOPES as readonly string[]).includes(scope));
  const scopes = new Set(known);
  if (scopes.has(WRITE_SCOPE)) scopes.add(READ_SCOPE);
  return [...scopes];
}

function absoluteUri(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.hash;
  } catch {
    return false;
  }
}

export function parseRegistration(body: unknown):
  | { ok: true; clientName: string; redirectUris: string[]; tokenEndpointAuthMethod: string }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid_client_metadata" };
  const record = body as { client_name?: unknown; redirect_uris?: unknown; token_endpoint_auth_method?: unknown };
  const clientName = typeof record.client_name === "string" ? record.client_name.trim().slice(0, 80) : "";
  const redirectUris = Array.isArray(record.redirect_uris) ? record.redirect_uris.filter((item): item is string => typeof item === "string") : [];
  if (!clientName || redirectUris.length === 0) return { ok: false, error: "invalid_client_metadata" };
  if (redirectUris.length > 5 || redirectUris.some((uri) => !absoluteUri(uri))) return { ok: false, error: "invalid_redirect_uri" };
  const method = typeof record.token_endpoint_auth_method === "string" ? record.token_endpoint_auth_method : "none";
  if (method !== "none" && method !== "client_secret_post" && method !== "client_secret_basic") {
    return { ok: false, error: "invalid_client_metadata" };
  }
  return { ok: true, clientName, redirectUris, tokenEndpointAuthMethod: method };
}

export function parseAuthorizeQuery(params: URLSearchParams, origin: string):
  | {
      ok: true;
      clientId: string;
      redirectUri: string;
      codeChallenge: string;
      scopes: string[];
      resource: string;
      state: string;
    }
  | { ok: false; error: string } {
  if (params.get("response_type") !== "code") return { ok: false, error: "unsupported_response_type" };
  const clientId = params.get("client_id")?.trim() ?? "";
  const redirectUri = params.get("redirect_uri")?.trim() ?? "";
  const codeChallenge = params.get("code_challenge")?.trim() ?? "";
  const method = params.get("code_challenge_method") ?? "";
  if (!clientId || !absoluteUri(redirectUri)) return { ok: false, error: "invalid_request" };
  if (!codeChallenge || method !== "S256") return { ok: false, error: "invalid_request" };
  const scopes = parseScopes(params.get("scope") ?? undefined);
  if (!scopes.includes(READ_SCOPE)) return { ok: false, error: "invalid_scope" };
  const resource = params.get("resource")?.trim() || `${origin.replace(/\/$/, "")}/api/mcp`;
  if (resource !== `${origin.replace(/\/$/, "")}/api/mcp`) return { ok: false, error: "invalid_target" };
  return { ok: true, clientId, redirectUri, codeChallenge, scopes, resource, state: params.get("state") ?? "" };
}

export async function s256Challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export function pkceMatches(challenge: string, computed: string): boolean {
  if (challenge.length !== computed.length) return false;
  let diff = 0;
  for (let index = 0; index < challenge.length; index += 1) diff |= challenge.charCodeAt(index) ^ computed.charCodeAt(index);
  return diff === 0;
}

export async function codeExchangeAllowed(input: {
  codeChallenge: string;
  verifier: string;
  redirectUri: string;
  storedRedirect: string;
  expiresAt: number;
  consumedAt?: number;
  now: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.consumedAt || input.expiresAt <= input.now) return { ok: false, error: "invalid_grant" };
  if (input.redirectUri !== input.storedRedirect) return { ok: false, error: "invalid_grant" };
  if (input.verifier.length < 43 || input.verifier.length > 128) return { ok: false, error: "invalid_grant" };
  const computed = await s256Challenge(input.verifier);
  if (!pkceMatches(input.codeChallenge, computed)) return { ok: false, error: "invalid_grant" };
  return { ok: true };
}

export function assessGrant(
  grant: StoredGrant | null,
  tool: string,
  now: number,
): { ok: true; canWrite: boolean; workspaceId: string; userId: string } | { ok: false; status: 401 | 403; message: string } {
  if (!grant || grant.revokedAt || grant.expiresAt <= now) return { ok: false, status: 401, message: "unauthorized" };
  const canWrite = grant.scopes.includes(WRITE_SCOPE);
  if (isWriteTool(tool) && !canWrite) return { ok: false, status: 403, message: "write is not granted" };
  return { ok: true, canWrite, workspaceId: grant.workspaceId, userId: grant.userId };
}

export function resolveCredential(
  oauth: StoredGrant | null,
  ingest: IngestGrant | null,
  tool: string,
  now: number,
): { ok: true; canWrite: boolean; workspaceId: string } | { ok: false; status: 401 | 403; message: string } {
  if (oauth) return assessGrant(oauth, tool, now);
  if (!ingest || ingest.revokedAt) return { ok: false, status: 401, message: "unauthorized" };
  if (isWriteTool(tool) && !ingest.canWrite) return { ok: false, status: 403, message: "write is not granted" };
  return { ok: true, canWrite: ingest.canWrite, workspaceId: ingest.workspaceId };
}

export async function sealToken(raw: string, fields: Omit<StoredGrant, "tokenHash">): Promise<{ raw: string; record: StoredGrant }> {
  const tokenHash = await sha256Hex(raw);
  return { raw, record: { ...fields, tokenHash } };
}

export async function newTokenPair(fields: { userId: string; workspaceId: string; scopes: string[] }, now: number) {
  const access = await sealToken(randomToken(), {
    userId: fields.userId,
    workspaceId: fields.workspaceId,
    scopes: fields.scopes,
    expiresAt: now + ACCESS_TTL_SECONDS * 1000,
  });
  const refresh = await sealToken(randomToken(), {
    userId: fields.userId,
    workspaceId: fields.workspaceId,
    scopes: fields.scopes,
    expiresAt: now + REFRESH_TTL_SECONDS * 1000,
  });
  return { access, refresh };
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
