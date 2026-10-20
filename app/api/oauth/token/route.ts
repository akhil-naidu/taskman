import { connection } from "next/server";
import { api, convexHttp } from "@/lib/convex-http";

export async function POST(request: Request) {
  await connection();
  const form = await readForm(request);
  const basic = basicAuth(request);
  const clientId = basic?.clientId || form.get("client_id") || "";
  const clientSecret = basic?.clientSecret || form.get("client_secret") || "";
  const convex = convexHttp();
  if (!convex) return Response.json({ error: "server_error" }, { status: 503 });
  const result = await convex.mutation(api.oauth.exchange, {
    grantType: form.get("grant_type") ?? "",
    clientId,
    ...(clientSecret ? { clientSecret } : {}),
    ...(form.get("code") ? { code: form.get("code") ?? "" } : {}),
    ...(form.get("redirect_uri") ? { redirectUri: form.get("redirect_uri") ?? "" } : {}),
    ...(form.get("code_verifier") ? { codeVerifier: form.get("code_verifier") ?? "" } : {}),
    ...(form.get("refresh_token") ? { refreshToken: form.get("refresh_token") ?? "" } : {}),
    ...(form.get("resource") ? { resource: form.get("resource") ?? "" } : {}),
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    token_type: result.token_type,
    expires_in: result.expires_in,
    scope: result.scope,
  });
}

async function readForm(request: Request): Promise<URLSearchParams> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const params = new URLSearchParams();
    if (body) {
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === "string") params.set(key, value);
      }
    }
    return params;
  }
  const text = await request.text();
  return new URLSearchParams(text);
}

function basicAuth(request: Request): { clientId: string; clientSecret: string } | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Basic\s+(.+)$/i);
  if (!match?.[1]) return null;
  const decoded = atob(match[1]);
  const split = decoded.indexOf(":");
  if (split < 0) return null;
  return { clientId: decodeURIComponent(decoded.slice(0, split)), clientSecret: decodeURIComponent(decoded.slice(split + 1)) };
}
