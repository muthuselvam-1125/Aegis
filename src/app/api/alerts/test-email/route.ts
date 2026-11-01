import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  sendAlertEmailMulti,
  verifySmtpConnection,
  getSmtpCredentials,
  type AlertEmailPayload,
} from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleTestDispatch(req);
}

export async function POST(req: NextRequest) {
  return handleTestDispatch(req);
}

async function handleTestDispatch(req: NextRequest) {
  try {
    const url = new URL(req.url);
    let targetEmail = url.searchParams.get("email");
    let hazard = url.searchParams.get("hazard") || "flood";
    let severity = url.searchParams.get("severity") || "warning";
    let area = url.searchParams.get("area") || "Tamil Nadu Region";

    // If body contains JSON, override query params
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.email) targetEmail = body.email;
        if (body.hazard) hazard = body.hazard;
        if (body.severity) severity = body.severity;
        if (body.area) area = body.area;
      } catch {
        // Body was empty or not JSON, continue with query params
      }
    }

    // 1. Verify SMTP connection
    const smtpCheck = await verifySmtpConnection();
    const creds = getSmtpCredentials();

    // 2. Resolve recipient list
    let recipientEmails: string[] = [];
    if (targetEmail && targetEmail.includes("@")) {
      recipientEmails = [targetEmail.trim().toLowerCase()];
    } else {
      // Query all registered users in the database
      const userRows = await db.select({ email: users.email }).from(users);
      recipientEmails = [
        ...new Set(
          userRows
            .map((u) => u.email.trim().toLowerCase())
            .filter((e) => e.length > 3 && e.includes("@"))
        ),
      ];
    }

    if (recipientEmails.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No registered users found in the database to dispatch alerts to.",
        smtpStatus: smtpCheck,
      }, { status: 400 });
    }

    // 3. Prepare Alert Payload
    const alertPayload: AlertEmailPayload = {
      hazard,
      severity,
      title: `${hazard.toUpperCase()} Life-Safety Warning`,
      headline: `Automated Multi-User Live Dispatch Test initiated for ${area}.`,
      instruction: "This is a verified test dispatch from AEGIS Platform. Take necessary precautions if this was an emergency.",
      area,
      isEscalation: severity === "emergency",
    };

    // 4. Dispatch alert across recipient list using resilient multi-user broadcast
    const dispatchResult = await sendAlertEmailMulti(recipientEmails, alertPayload);

    return NextResponse.json({
      success: dispatchResult.sent > 0,
      message: `Alert dispatched to ${dispatchResult.sent} of ${dispatchResult.total} recipient(s).`,
      smtp: {
        host: creds.host,
        port: creds.port,
        user: creds.user ? creds.user.replace(/(.{3}).*(@.*)/, "$1***$2") : "Not configured",
        verified: smtpCheck.ok,
        verificationMessage: smtpCheck.message,
      },
      dispatch: dispatchResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Test Alert Dispatch Error]:", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Failed to execute alert dispatch test",
    }, { status: 500 });
  }
}
