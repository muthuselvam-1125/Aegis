import { getPlaces, addPlace, deletePlace, addMember } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { calculateCoastalDistanceKm, fetchElevation } from "@/lib/gis";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ places: await getPlaces(session.userId) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  if (!b.name || b.lat == null || b.lon == null) {
    return Response.json({ error: "name, lat, lon required" }, { status: 400 });
  }

  const lat = Number(b.lat);
  const lon = Number(b.lon);

  let elevationM = b.elevationM != null && b.elevationM !== "" ? Number(b.elevationM) : 0;
  if ((elevationM <= 0 || elevationM === 10) && (lat !== 0 || lon !== 0)) {
    elevationM = await fetchElevation(lat, lon);
  }

  const coastalKm = calculateCoastalDistanceKm(lat, lon);
  const cleanName = String(b.name || "").split(" — ")[0].trim();
  const region = (b.region || (String(b.name).includes(" — ") ? String(b.name).split(" — ")[1].trim() : "")).trim();

  const newPlace = await addPlace({
    ...b,
    name: cleanName,
    region,
    lat,
    lon,
    elevationM,
    coastalKm,
  }, session.userId);

  if (session.name && b.isPrimary) {
    await addMember({
      name: session.name,
      role: "adult",
      placeId: newPlace.id,
      status: "safe",
    }, session.userId);
  }

  return Response.json({ ok: true, place: newPlace });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await deletePlace(id, session.userId);
  return Response.json({ ok: true, places: await getPlaces(session.userId) });
}

