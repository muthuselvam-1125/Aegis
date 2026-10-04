import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, places, members } from "@/db/schema";
import { eq, or, like, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Delete user Rohith from users table
    await db.execute(sql`
      DELETE FROM "users" 
      WHERE LOWER("name") LIKE '%rohith%' OR LOWER("email") LIKE '%rohith%';
    `);

    // Clean up orphan places and members if any
    await db.execute(sql`
      DELETE FROM "places" 
      WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM "users");
    `);

    await db.execute(sql`
      DELETE FROM "members" 
      WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM "users");
    `);

    return NextResponse.json({ ok: true, message: "User Rohith deleted successfully from database" });
  } catch (e: any) {
    console.error("Delete user error:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
