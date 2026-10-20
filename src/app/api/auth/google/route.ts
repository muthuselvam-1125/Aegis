import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, places } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request payload format" }, { status: 400 });
    }

    const { credential, email, name, avatarUrl } = body;

    let userEmail = email;
    let userName = name;
    let userAvatar = avatarUrl;

    // Decode Google ID Token if passed
    if (credential && typeof credential === "string") {
      try {
        const parts = credential.split(".");
        if (parts.length === 3) {
          let rawPayload = "";
          try {
            rawPayload = Buffer.from(parts[1], "base64url").toString("utf-8");
          } catch {
            rawPayload = Buffer.from(parts[1], "base64").toString("utf-8");
          }
          const payload = JSON.parse(rawPayload);
          if (payload.email) userEmail = payload.email;
          if (payload.name) userName = payload.name;
          if (payload.picture) userAvatar = payload.picture;
        }
      } catch (err) {
        console.warn("Google token parse warning:", err);
      }
    }

    if (!userEmail || typeof userEmail !== "string" || !userEmail.includes("@")) {
      return NextResponse.json({ error: "Valid Google account email required" }, { status: 400 });
    }

    const cleanEmail = userEmail.trim().toLowerCase();
    const displayName = userName && String(userName).trim() !== "" ? String(userName).trim() : cleanEmail.split("@")[0];

    // 1. Check if user already exists
    let [existingUser] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

    const isNewUser = !existingUser;

    if (!existingUser) {
      // 2. Auto-register user from Google Account credentials
      const dummyPasswordHash = await bcrypt.hash(`google-oauth-${cleanEmail}-${Date.now()}`, 10);
      
      const [newUser] = await db.insert(users).values({
        email: cleanEmail,
        name: displayName,
        passwordHash: dummyPasswordHash,
        avatarUrl: userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
        isVerified: true,
      }).returning();

      existingUser = newUser;
    }

    // 3. Create session cookie
    await createSession(existingUser.id, existingUser.email, existingUser.name);

    return NextResponse.json({
      success: true,
      isNewUser,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        avatarUrl: existingUser.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error("Google SSO Auth Error:", error);
    const msg = error?.message || "Failed to authenticate with Google";
    if (msg.includes("ECONNREFUSED") || msg.includes("connect") || msg.includes("timeout")) {
      return NextResponse.json(
        { error: "Database offline. Please ensure PostgreSQL is running." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
