import * as dotenv from "dotenv";
dotenv.config();

import { syncPlatformAlerts } from "../src/lib/data";

async function main() {
  console.log("=========================================");
  console.log("TESTING CRON MORNING DIGEST EXECUTION...");
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Configured (Neon)" : "Missing");
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("=========================================\n");

  try {
    const result = await syncPlatformAlerts(true);
    console.log("\n✅ CRON EXECUTION SUCCESSFUL!");
    console.log("Execution Result Details:", result);
  } catch (err) {
    console.error("❌ CRON EXECUTION FAILED:", err);
  } finally {
    process.exit(0);
  }
}

main();
