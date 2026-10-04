import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`DELETE FROM "alerts"`);
    await db.execute(sql`DELETE FROM "members"`);
    await db.execute(sql`DELETE FROM "places"`);
    await db.execute(sql`DELETE FROM "users"`);
    return NextResponse.json({ ok: true, message: "Data wiped successfully" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message });
  }
}
