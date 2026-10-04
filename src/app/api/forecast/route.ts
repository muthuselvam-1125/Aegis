import { getPlace, getPlaces } from "@/lib/data";
import { currentConditions, hourly, daily, sunTimes, nowcast, fetchClimateProjections } from "@/lib/wx";
import { crossCheckWithNasaPower } from "@/lib/nasaPower";
import { topRisks } from "@/lib/hazards";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const placeId = url.searchParams.get("place");
    const places = await getPlaces(session.userId);
    const place = placeId ? places.find(p => p.id === Number(placeId)) : (places[0] ?? null);

    if (!place) {
      return Response.json({ error: "No configured locations available" }, { status: 404 });
    }

    // Resolve all calculations concurrently
    const [current, hourData, dayData, minuteData, climateData] = await Promise.all([
      currentConditions(place.lat, place.lon),
      hourly(place.lat, place.lon, 48),
      daily(place.lat, place.lon, 14),
      nowcast(place.lat, place.lon),
      fetchClimateProjections(place.lat, place.lon)
    ]);

    // Cross-check the live reading against NASA POWER's long-run climatology
    // for this exact coordinate — flags implausible readings (e.g. a
    // coordinate typo), never overrides the live Open-Meteo numbers shown.
    const climateCheck = await crossCheckWithNasaPower(place.lat, place.lon, current.tempC.mean);

    const sun = sunTimes(place.lat, place.lon);
    const offsetHours = current.utcOffset / 3600;
    sun.sunriseHour = (sun.sunriseHour + offsetHours + 24) % 24;
    sun.sunsetHour = (sun.sunsetHour + offsetHours + 24) % 24;
    const risks = await topRisks(place, new Date(), current);

    return Response.json({
      place,
      current,
      hourly: hourData,
      daily: dayData,
      nowcast: minuteData,
      sun,
      risks,
      climate: climateData,
      climateCheck
    });
  } catch (error) {
    console.error("Critical dashboard telemetry fetch exception", error);
    return Response.json({ error: "Internal telemetry failure" }, { status: 500 });
  }
}
