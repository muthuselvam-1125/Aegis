import { db } from "../src/db";
import { alerts } from "../src/db/schema";
import { like } from "drizzle-orm";

async function main() {
  await db.delete(alerts).where(like(alerts.title, "%Daily Morning Digest%"));
  console.log("Deleted old digests. Ready for fresh test.");
}
main().catch(console.error);
