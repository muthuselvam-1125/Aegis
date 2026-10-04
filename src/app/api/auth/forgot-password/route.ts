import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

    if (!user) {
      // Return success anyway to prevent email enumeration attacks
      return NextResponse.json({ success: true, message: "If an account exists, an OTP code has been generated." });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    await db.insert(passwordResets).values({
      userId: user.id,
      token: otpCode,
      expiresAt,
    });

    console.log(`
=========================================
🔐 AEGIS OTP PASSWORD RESET CODE FOR ${user.email}:
👉 OTP CODE: ${otpCode}
Valid for 15 minutes.
=========================================
`);

    return NextResponse.json({
      success: true,
      message: "An OTP recovery code has been issued.",
      // Demo helper: returns OTP code in dev so user can test immediately without configuring SMTP
      devOtp: process.env.NODE_ENV !== "production" ? otpCode : undefined,
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 });
  }
}
