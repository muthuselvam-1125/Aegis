import { getAlerts, syncPlatformAlerts } from "@/lib/data";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await syncPlatformAlerts();
  const session = await getSession();
  console.log("ALERTS API SESSION:", session);
  const alerts = await getAlerts(session?.userId);
  console.log("ALERTS API ALERTS LENGTH:", alerts.length);
  return Response.json({ alerts, generatedAt: new Date().toISOString() });
}
