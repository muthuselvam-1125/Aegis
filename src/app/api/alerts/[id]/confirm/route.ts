import { db } from "@/db";
import { confirmations, alerts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const alertId = Number(id);
  const body = await req.json().catch(() => ({}));
  const verdict = body.verdict === "deny" ? "deny" : "confirm";
  await db.insert(confirmations).values({ alertId, verdict, note: body.note ?? "" });

  // Auto-downgrade: if the community consistently denies, drop the alert a level.
  const tally = await db
    .select({ verdict: confirmations.verdict, c: sql<number>`count(*)::int` })
    .from(confirmations)
    .where(eq(confirmations.alertId, alertId))
    .groupBy(confirmations.verdict);
  const confirm = tally.find((t) => t.verdict === "confirm")?.c ?? 0;
  const deny = tally.find((t) => t.verdict === "deny")?.c ?? 0;

  let downgraded = false;
  if (deny >= 5 && deny > confirm * 2) {
    const cur = await db.select().from(alerts).where(eq(alerts.id, alertId));
    const a = cur[0];
    if (a && a.source === "platform") {
      const order = ["calm", "advisory", "watch", "warning", "emergency"];
      const idx = Math.max(0, order.indexOf(a.severity) - 1);
      await db.update(alerts).set({ severity: order[idx] }).where(eq(alerts.id, alertId));
      downgraded = true;
    }
  }
  return Response.json({ ok: true, confirm, deny, downgraded });
}
