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
  const isRemote = databaseUrl.includes("neon.tech") || databaseUrl.includes("sslmode=require");
  const p = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
    max: 10,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });
  p.on("error", (err) => {
    console.warn("[AEGIS] PostgreSQL offline — fallback engine active:", err.message);
  });
  return p;
}

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
