import { NextResponse } from "next/server";
import { getCombinedEarthquakes } from "@/lib/disaster";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location") || undefined;
    const minMagnitude = searchParams.get("minMagnitude")
      ? parseFloat(searchParams.get("minMagnitude")!)
      : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const indiaOnly = searchParams.get("indiaOnly") === "true";
    const format = searchParams.get("format");

    const result = await getCombinedEarthquakes({
      location,
      minMagnitude,
      indiaOnly,
      limit,
    });

    if (format === "geojson") {
      const geojson = {
        type: "FeatureCollection",
        metadata: {
          generated: Date.now(),
          count: result.all.length,
          title: "AEGIS Combined Live Earthquakes (NCS & USGS)",
          mostRecentIndia: result.mostRecentIndia,
        },
        features: result.all.map((q) => ({
          type: "Feature",
          id: q.id,
          properties: {
            mag: q.magnitude,
            place: q.place,
            time: q.timestamp,
            timeIST: q.timeIST,
            timeUTC: q.timeUTC,
            depth: q.depthKm,
            source: q.source,
            agency: q.agency,
            stateOrRegion: q.stateOrRegion,
            isIndia: q.isIndia,
          },
          geometry: {
            type: "Point",
            coordinates: [q.longitude, q.latitude, q.depthKm],
          },
        })),
      };
      return NextResponse.json(geojson);
    }

    return NextResponse.json({
      success: true,
      count: result.all.length,
      mostRecentIndia: result.mostRecentIndia,
      earthquakes: result.all,
    });
  } catch (error: any) {
    console.error("[api/earthquakes] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch earthquakes" }, { status: 500 });
  }
}
