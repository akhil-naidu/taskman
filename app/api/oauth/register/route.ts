import { connection } from "next/server";
import { parseRegistration } from "@/convex/model/oauth";
import { api, convexHttp } from "@/lib/convex-http";

export async function POST(request: Request) {
  await connection();
  const body = await request.json().catch(() => null);
  const parsed = parseRegistration(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const convex = convexHttp();
  if (!convex) return Response.json({ error: "server_error" }, { status: 503 });
  const registered = await convex.mutation(api.oauth.registerClient, {
    clientName: parsed.clientName,
    redirectUris: parsed.redirectUris,
    tokenEndpointAuthMethod: parsed.tokenEndpointAuthMethod,
  });
  return Response.json(registered, { status: 201 });
}
