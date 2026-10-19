import { NextRequest, NextResponse } from "next/server";
import { syncPlatformAlerts } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await syncPlatformAlerts();
    return NextResponse.json({ success: true, message: "Morning digest sent" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to sync morning digest" }, { status: 500 });
  }
}
