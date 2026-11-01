import { getPlace, getPlaces } from "@/lib/data";
import { currentConditions, hourly, daily, sunTimes, nowcast, fetchClimateProjections } from "@/lib/wx";
import { crossCheckWithNasaPower } from "@/lib/nasaPower";
import { topRisks } from "@/lib/hazards";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface TelemetryPayload {
  current: any;
  hourly: any;
  daily: any;
  nowcast: any;
  sun: any;
  risks: any;
  climate: any;
  climateCheck: any;
}

interface TelemetryCacheEntry {
  payload: TelemetryPayload;
  timestamp: number;
}

// In-memory SWR (Stale-While-Revalidate) cache keyed by lat:lon
const telemetryCache = new Map<string, TelemetryCacheEntry>();
const inFlightRequests = new Map<string, Promise<TelemetryPayload>>();

const TELEMETRY_FRESH_TTL_MS = 3 * 60 * 1000; // 3 minutes fresh TTL (2-5m requirement)
const TELEMETRY_MAX_STALE_MS = 15 * 60 * 1000; // 15 minutes stale serving

async function computeTelemetry(place: any): Promise<TelemetryPayload> {
  // Resolve all calculations concurrently
  const [current, hourData, dayData, minuteData, climateData] = await Promise.all([
    currentConditions(place.lat, place.lon),
    hourly(place.lat, place.lon, 48),
    daily(place.lat, place.lon, 14),
    nowcast(place.lat, place.lon),
    fetchClimateProjections(place.lat, place.lon),
  ]);

  // Cross-check the live reading against NASA POWER's long-run climatology
  const climateCheck = await crossCheckWithNasaPower(place.lat, place.lon, current.tempC.mean);

  const sun = sunTimes(place.lat, place.lon);
  const offsetHours = current.utcOffset / 3600;
  sun.sunriseHour = (sun.sunriseHour + offsetHours + 24) % 24;
  sun.sunsetHour = (sun.sunsetHour + offsetHours + 24) % 24;
  const risks = await topRisks(place, new Date(), current);

  return {
    current,
    hourly: hourData,
    daily: dayData,
    nowcast: minuteData,
    sun,
    risks,
    climate: climateData,
    climateCheck,
  };
}

async function getOrFetchTelemetry(place: any): Promise<TelemetryPayload> {
  const cacheKey = `${Number(place.lat).toFixed(3)}:${Number(place.lon).toFixed(3)}`;

  // De-duplicate in-flight requests for the same coordinates
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) return inFlight;

  const fetchPromise = computeTelemetry(place)
    .then((payload) => {
      telemetryCache.set(cacheKey, { payload, timestamp: Date.now() });
      return payload;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const placeId = url.searchParams.get("place");
    const places = await getPlaces(session.userId);
    const place = placeId ? places.find((p) => p.id === Number(placeId)) : (places[0] ?? null);

    if (!place) {
      return Response.json({ error: "No configured locations available" }, { status: 404 });
    }

    const cacheKey = `${Number(place.lat).toFixed(3)}:${Number(place.lon).toFixed(3)}`;
    const cached = telemetryCache.get(cacheKey);
    const now = Date.now();

    if (cached) {
      const age = now - cached.timestamp;
      if (age < TELEMETRY_FRESH_TTL_MS) {
        // Fresh telemetry: sub-50ms instant response
        return Response.json({
          place,
          ...cached.payload,
        });
      }

      if (age < TELEMETRY_MAX_STALE_MS) {
        // Stale-While-Revalidate: trigger async background refresh
        getOrFetchTelemetry(place).catch((err) => {
          console.error(`[forecast] Background SWR refresh failed for ${place.name}:`, err);
        });

        // Serve cached telemetry immediately without blocking
        return Response.json({
          place,
          ...cached.payload,
        });
      }
    }

    // Cold cache: fetch telemetry
    const telemetry = await getOrFetchTelemetry(place);

    return Response.json({
      place,
      ...telemetry,
    });
  } catch (error) {
    console.error("Critical dashboard telemetry fetch exception", error);
    return Response.json({ error: "Internal telemetry failure" }, { status: 500 });
  }
}
