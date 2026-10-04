import { getAlerts, syncPlatformAlerts } from "@/lib/data";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await syncPlatformAlerts();
  const session = await getSession();
  const alerts = await getAlerts(session?.userId);
  return Response.json({ alerts, generatedAt: new Date().toISOString() });
}
