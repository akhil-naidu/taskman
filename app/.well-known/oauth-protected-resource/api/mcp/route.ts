import { connection } from "next/server";
import { protectedResourceMetadata, publicOrigin } from "@/convex/model/oauth";

export async function GET(request: Request) {
  await connection();
  return Response.json(protectedResourceMetadata(publicOrigin(request, process.env.SITE_URL)));
}
