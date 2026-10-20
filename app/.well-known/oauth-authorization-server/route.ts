import { connection } from "next/server";
import { authorizationServerMetadata, publicOrigin } from "@/convex/model/oauth";

export async function GET(request: Request) {
  await connection();
  return Response.json(authorizationServerMetadata(publicOrigin(request, process.env.SITE_URL)));
}
