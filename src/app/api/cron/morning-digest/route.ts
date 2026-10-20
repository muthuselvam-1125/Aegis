import { NextRequest, NextResponse } from "next/server";
import { syncPlatformAlerts } from "@/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow sufficient time for DB queries, Open-Meteo fetches, and SMTP handshakes

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Morning Digest Cron] Unauthorized request. Missing or mismatched CRON_SECRET.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncPlatformAlerts(true);
    return NextResponse.json({
      success: true,
      message: "Morning digest processed",
      details: summary,
    });
  } catch (error: any) {
    console.error("[Morning Digest Cron] Execution failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync morning digest" },
      { status: 500 }
    );
  }
}

