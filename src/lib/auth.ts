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

/**
 * In-process session cache keyed by JWT token string.
 * Caches the verified session payload for 60 seconds to avoid
 * redundant DB round-trips when the same request cycle calls
 * getSession() multiple times (e.g. layout + route + middleware).
 * TTL is intentionally short so revoked tokens clear quickly.
 */
interface SessionCacheEntry {
  payload: any;
  expiresAt: number;
}
const SESSION_CACHE = new Map<string, SessionCacheEntry>();
const SESSION_CACHE_TTL_MS = 60_000; // 60s — short enough to respect revocations

// Prune stale entries periodically so the map doesn't grow unbounded
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of SESSION_CACHE) {
      if (v.expiresAt < now) SESSION_CACHE.delete(k);
    }
  }, 120_000);
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("aegis_session")?.value;
  if (!session) return null;

  // Fast-path: return from cache if still valid
  const cached = SESSION_CACHE.get(session);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const payload = await decrypt(session);
  if (!payload) return null;

  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const dbUser = await db.select({ id: users.id }).from(users).where(eq(users.id, payload.userId as number)).limit(1);
    if (dbUser.length === 0) return null;

    // Cache the verified session payload
    SESSION_CACHE.set(session, { payload, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
  } catch (error) {
    console.error("Session verification failed", error);
    // Still return payload if DB is temporarily unreachable — JWT is still valid
    SESSION_CACHE.set(session, { payload, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
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
  const session = cookieStore.get("aegis_session")?.value;
  if (session) SESSION_CACHE.delete(session); // Immediately invalidate cache on logout
  cookieStore.set("aegis_session", "", { expires: new Date(0), path: "/" });
}
