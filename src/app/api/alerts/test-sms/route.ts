import { NextRequest, NextResponse } from "next/server";
import { sendAlertSMS } from "@/lib/sms";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    // Dummy alert data
    const alertData = {
      severity: "emergency",
      title: "Flash Flood Warning",
      area: "Your Region",
      instruction: "Move to higher ground safely. Stay tuned to local news."
    };

    console.log(`Triggering test SMS alert to ${phone}...`);
    
    // Call the sms function that uses Pushbullet
    await sendAlertSMS(phone, alertData);

    return NextResponse.json({ success: true, message: `Test SMS dispatched to ${phone}` });
  } catch (error: any) {
    console.error("Test SMS Error:", error);
    return NextResponse.json({ error: error.message || "Failed to send test SMS" }, { status: 500 });
  }
}
