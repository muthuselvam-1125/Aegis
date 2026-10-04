import { getResources } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ resources: await getResources() });
}
