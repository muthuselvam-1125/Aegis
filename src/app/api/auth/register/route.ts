import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, places, members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, location } = await req.json();

    if (!name || !email || !password || !location) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check existing
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.transaction(async (tx) => {
      // Insert user first to get userId
      const [user] = await tx.insert(users).values({
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        isVerified: true,
      }).returning();

      // Insert location with userId
      const [newPlace] = await tx.insert(places).values({
        name: location.name,
        label: "home",
        lat: location.latitude,
        lon: location.longitude,
        region: location.admin1 || "",
        country: location.country || "",
        isPrimary: true,
        userId: user.id,
      }).returning();

      // Automatically add the registering user to the household roster at their home
      await tx.insert(members).values({
        name: name.trim(),
        role: "adult",
        placeId: newPlace.id,
        status: "safe",
        statusNote: "",
        bloodType: "",
        allergies: "",
        medical: "",
        emergencyContact: "",
        lastCheckIn: new Date(),
        userId: user.id,
      });

      return user;
    });

    await createSession(newUser.id, newUser.email, newUser.name);

    return NextResponse.json({
      success: true,
      user: { id: newUser.id, name: newUser.name, email: newUser.email },
    });
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: error.message || "Failed to register" }, { status: 500 });
  }
}
