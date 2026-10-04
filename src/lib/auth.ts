import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.JWT_SECRET || "aegis-super-secret-development-key-change-in-prod";
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, { algorithms: ["HS256"] });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("aegis_session")?.value;
  if (!session) return null;
  const payload = await decrypt(session);
  if (!payload) return null;

  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const dbUser = await db.select().from(users).where(eq(users.id, payload.userId as number)).limit(1);
    if (dbUser.length === 0) return null;
  } catch (error) {
    console.error("Session verification failed", error);
  }

  return payload;
}

export async function createSession(userId: number, email: string, name: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ userId, email, name, expires });

  const cookieStore = await cookies();
  cookieStore.set("aegis_session", session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.VERCEL === "1",
    sameSite: "lax",
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set("aegis_session", "", { expires: new Date(0), path: "/" });
}
