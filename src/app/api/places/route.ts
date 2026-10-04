import { getPlaces, addPlace, deletePlace, addMember } from "@/lib/data";
import { getSession } from "@/lib/auth";

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

  const newPlace = await addPlace(b, session.userId);

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

  await deletePlace(id);
  return Response.json({ ok: true, places: await getPlaces(session.userId) });
}
