import { getChecklist } from "@/lib/data";
import { db } from "@/db";
import { checklist } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ checklist: await getChecklist() });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id);
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await db.update(checklist).set({ done: !!b.done }).where(eq(checklist.id, id));
  return Response.json({ ok: true, checklist: await getChecklist() });
}
