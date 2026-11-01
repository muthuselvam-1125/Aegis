import { getAlerts, syncPlatformAlerts } from "@/lib/data";
import { decrypt, getSession } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

interface CachedAlerts {
  alerts: any[];
  timestamp: number;
}

const alertsCache = new Map<string, CachedAlerts>();
const CACHE_TTL_MS = 30000; // 30-second TTL
let lastSyncTrigger = 0;
const SYNC_COOLDOWN_MS = 60000; // Background sync cooldown: at most once every 60s

async function refreshAlerts(cacheKey: string, userId?: number) {
  try {
    const alerts = await getAlerts(userId);
    alertsCache.set(cacheKey, { alerts: alerts || [], timestamp: Date.now() });
  } catch (err) {
    console.error(`[api/alerts] Background refresh failed for ${cacheKey}:`, err);
  }
}

export async function GET() {
  try {
    const now = Date.now();

    // Trigger non-blocking external weather sync if cooldown elapsed (fire-and-forget)
    if (now - lastSyncTrigger > SYNC_COOLDOWN_MS) {
      lastSyncTrigger = now;
      setTimeout(() => {
        syncPlatformAlerts().catch((err) => {
          console.error("[api/alerts] Background sync error:", err);
        });
      }, 0);
    }

    // Fast-path local session decode (zero remote network hops)
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("aegis_session")?.value;
    const sessionPayload = sessionToken ? await decrypt(sessionToken) : null;
    const cacheKey = sessionPayload?.userId ? `user_${sessionPayload.userId}` : "public";

    const cached = alertsCache.get(cacheKey);

    // Instant response from cache: sub-50ms
    if (cached) {
      if (now - cached.timestamp > CACHE_TTL_MS) {
        refreshAlerts(cacheKey, sessionPayload?.userId);
      }
      return Response.json({
        alerts: cached.alerts,
        generatedAt: new Date(cached.timestamp).toISOString(),
      });
    }

    // Cold start fallback: resolve user session and fetch alerts
    const session = await getSession();
    const alerts = await getAlerts(session?.userId);
    const safeAlerts = alerts || [];
    alertsCache.set(cacheKey, { alerts: safeAlerts, timestamp: Date.now() });

    return Response.json({
      alerts: safeAlerts,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/alerts] Route handler error:", error);
    return Response.json(
      {
        alerts: [],
        error: "Failed to load alerts",
        generatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
