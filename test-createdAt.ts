import { db } from "./src/db";
import { alerts } from "./src/db/schema";
import { eq, desc } from "drizzle-orm";

async function run() {
  const existing = await db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(1);
  console.log("Alert:", existing[0]);
  console.log("Type of createdAt:", typeof existing[0].createdAt);
  console.log("Value:", existing[0].createdAt);
  
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  console.log("twelveHoursAgo:", twelveHoursAgo);
  console.log("is recent?", new Date(existing[0].createdAt) > twelveHoursAgo);
}

run().catch(console.error).finally(() => process.exit(0));
