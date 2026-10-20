import { connection } from "next/server";
import { parseAuthorizeQuery, publicOrigin } from "@/convex/model/oauth";

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const origin = publicOrigin(request, process.env.SITE_URL);
  const parsed = parseAuthorizeQuery(url.searchParams, origin);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const consent = new URL("/oauth/consent", origin);
  url.searchParams.forEach((value, key) => consent.searchParams.set(key, value));
  return Response.redirect(consent);
}
