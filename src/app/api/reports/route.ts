import { NextRequest, NextResponse } from "next/server";
import { getReports, addReport, updateReportVerified } from "@/lib/data";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const data = await getReports();
    return NextResponse.json({ reports: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.body) {
      return NextResponse.json({ error: "Report body is required" }, { status: 400 });
    }
    const session = await getSession();
    if (!body.reporter || body.reporter.trim() === "") {
      if (session) {
        body.reporter = `${session.name} (${session.email})`;
      } else {
        body.reporter = "Anonymous Community Member";
      }
    }
    const newReport = await addReport(body);
    return NextResponse.json({ success: true, report: newReport });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in to verify reports." }, { status: 401 });
    }

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "Report id is required" }, { status: 400 });
    }
    const updated = await updateReportVerified(Number(body.id), body.verified !== false);
    return NextResponse.json({ success: true, report: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


