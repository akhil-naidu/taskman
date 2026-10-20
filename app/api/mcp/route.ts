import { connection } from "next/server";
import { blankState, handleMcpMessage, mcpHttpBody, methodOf, needsToken, originAllowed, protocolVersionAllowed, bearerToken, type McpOutcome } from "@/convex/model/mcp";
import { publicOrigin, wwwAuthenticate } from "@/convex/model/oauth";
import { sha256Hex } from "@/convex/model/secrets";
import { api, convexHttp } from "@/lib/convex-http";

export async function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export async function POST(request: Request) {
  await connection();
  const origin = publicOrigin(request, process.env.SITE_URL);
  if (!originAllowed(request.headers.get("origin"), process.env.SITE_URL)) {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "origin rejected" } }, { status: 403 });
  }
  if (!protocolVersionAllowed(request.headers.get("mcp-protocol-version"))) {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "unsupported protocol version" } }, { status: 400 });
  }
  const message = await request.json().catch(() => null);
  const method = methodOf(message);
  if (!needsToken(method)) return pack(request, handleMcpMessage(message, null, blankState()), origin);
  const raw = bearerToken(request.headers.get("authorization"));
  if (!raw) return pack(request, handleMcpMessage(message, null, blankState()), origin);
  const convex = convexHttp();
  if (!convex) {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "workspace store is not configured" } }, { status: 503 });
  }
  const tokenHash = await sha256Hex(raw);
  const dispatched = await convex.mutation(api.mcp.dispatch, { tokenHash, message });
  return pack(request, { httpStatus: dispatched.httpStatus, body: dispatched.body, nextState: null }, origin);
}

function pack(request: Request, outcome: McpOutcome, origin: string) {
  const packed = mcpHttpBody(request.headers.get("accept") ?? "", outcome);
  const headers = new Headers();
  if (packed.contentType) headers.set("Content-Type", packed.contentType);
  if (outcome.httpStatus === 401) headers.set("WWW-Authenticate", wwwAuthenticate(origin));
  if (packed.body === null) return new Response(null, { status: packed.status, headers });
  return new Response(packed.body, { status: packed.status, headers });
}
