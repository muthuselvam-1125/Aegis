import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, places } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { credential, email, name, avatarUrl } = await req.json();

    let userEmail = email;
    let userName = name;
    let userAvatar = avatarUrl;

    // Decode Google ID Token if passed
    if (credential && typeof credential === "string") {
      try {
        const parts = credential.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          if (payload.email) userEmail = payload.email;
          if (payload.name) userName = payload.name;
          if (payload.picture) userAvatar = payload.picture;
        }
      } catch (err) {
        console.warn("Google token parse warning:", err);
      }
    }

    if (!userEmail || !userEmail.includes("@")) {
      return NextResponse.json({ error: "Valid Google account email required" }, { status: 400 });
    }

    const cleanEmail = userEmail.trim().toLowerCase();
    const displayName = userName && userName.trim() !== "" ? userName.trim() : cleanEmail.split("@")[0];

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
    return NextResponse.json({ error: error.message || "Failed to authenticate with Google" }, { status: 500 });
  }
}
