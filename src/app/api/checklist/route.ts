import { getChecklist, updateChecklistProgress } from "@/lib/data";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const userId = session?.userId ? Number(session.userId) : undefined;
  const items = await getChecklist(userId);
  return Response.json({ checklist: items, userId: userId || null });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.userId) {
    return Response.json({ error: "Unauthorized. Please log in to save checklist progress." }, { status: 401 });
  }

  const b = await req.json().catch(() => ({}));
  const id = Number(b.id);
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const userId = Number(session.userId);
  await updateChecklistProgress(userId, id, !!b.done);
  return Response.json({ ok: true, checklist: await getChecklist(userId) });
}
