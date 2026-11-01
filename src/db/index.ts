import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

function createPool() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
  const isRemote =
    databaseUrl.includes("neon.tech") ||
    databaseUrl.includes("sslmode=verify-full") ||
    databaseUrl.includes("sslmode=require");
  const p = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 30000,
    query_timeout: 30000,
    idleTimeoutMillis: 120000, // 2 minutes to eliminate cold-start handshake delays
    max: 20,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });
  p.on("error", (err) => {
    console.error("Unexpected idle client error", err);
  });
  // Pre-warm the pool non-blockingly so the first user query doesn't wait for SSL/auth handshakes
  p.query("SELECT 1").catch((err) => {
    console.warn("[db] Connection pre-warm notice:", err?.message || err);
  });
  return p;
}

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ?? createPool();

pool.on("error", (err) => {
  console.error("Unexpected idle client error", err);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
