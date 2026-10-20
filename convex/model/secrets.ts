const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const INTEGRATION_PROVIDERS = ["clickup", "linear", "github", "jira", "dropbox"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export function isIntegrationProvider(value: string): value is IntegrationProvider {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encryptionKeyBytes(material: string): Uint8Array<ArrayBuffer> {
  const bytes = base64ToBytes(material.trim());
  if (bytes.length !== 32) throw new Error("TASKMAN_ENCRYPTION_KEY must be 32 bytes of base64");
  return bytes;
}

export async function encryptString(plaintext: string, material: string): Promise<{ ciphertext: string; iv: string }> {
  const rawKey = encryptionKeyBytes(material);
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, textEncoder.encode(plaintext));
  return { ciphertext: bytesToBase64(new Uint8Array(cipher)), iv: bytesToBase64(iv) };
}

export async function decryptWorkspaceToken(
  material: string | undefined,
  sealed: { ciphertext: string; iv: string } | null,
): Promise<string | null> {
  if (!sealed) return null;
  if (!material) throw new Error("TASKMAN_ENCRYPTION_KEY is not set");
  return decryptString(sealed.ciphertext, sealed.iv, material);
}

export async function decryptString(ciphertext: string, iv: string, material: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encryptionKeyBytes(material), "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );
  return textDecoder.decode(plain);
}

export function secretHint(secret: string): string {
  const trimmed = secret.trim();
  return trimmed.slice(-4);
}

const CONFIG_KEYS = ["teamId", "listIds", "baseUrl", "email", "label"] as const;

export function sanitizeConfig(raw: string | undefined): string {
  if (!raw || !raw.trim()) return "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid config");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid config");
  const source = parsed as Record<string, unknown>;
  const next: Record<string, string> = {};
  for (const key of CONFIG_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) next[key] = value.trim().slice(0, 300);
  }
  return JSON.stringify(next);
}

export function readConfig(raw: string): { teamId: string; listIds: string[] } {
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }
  const source = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  const teamId = typeof source.teamId === "string" ? source.teamId : "";
  const listIds =
    typeof source.listIds === "string"
      ? source.listIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : [];
  return { teamId, listIds };
}

export type IngestTokenRecord = {
  tokenHash: string;
  revokedAt?: number;
  workspaceId: string;
};

export function findActiveToken(rows: IngestTokenRecord[], tokenHash: string): IngestTokenRecord | null {
  const row = rows.find((item) => item.tokenHash === tokenHash);
  if (!row || row.revokedAt) return null;
  return row;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function oauthClient(
  env: Record<string, string | undefined>,
  provider: string,
): { clientId: string; clientSecret: string } | null {
  if (provider === "jira") return null;
  const clientId = env[`TASKMAN_OAUTH_${provider.toUpperCase()}_CLIENT_ID`]?.trim();
  const clientSecret = env[`TASKMAN_OAUTH_${provider.toUpperCase()}_CLIENT_SECRET`]?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function authorizeUrl(provider: string, clientId: string, redirectUri: string, state: string): string | null {
  const redirect = encodeURIComponent(redirectUri);
  const encodedState = encodeURIComponent(state);
  const id = encodeURIComponent(clientId);
  if (provider === "clickup") {
    return `https://app.clickup.com/api?client_id=${id}&redirect_uri=${redirect}&state=${encodedState}`;
  }
  if (provider === "github") {
    return `https://github.com/login/oauth/authorize?client_id=${id}&redirect_uri=${redirect}&state=${encodedState}&scope=read:user`;
  }
  if (provider === "linear") {
    return `https://linear.app/oauth/authorize?client_id=${id}&redirect_uri=${redirect}&state=${encodedState}&response_type=code&scope=read`;
  }
  if (provider === "dropbox") {
    return `https://www.dropbox.com/oauth2/authorize?client_id=${id}&redirect_uri=${redirect}&state=${encodedState}&response_type=code&token_access_type=offline`;
  }
  return null;
}
