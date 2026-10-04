import { db } from "./src/db";
import { alerts } from "./src/db/schema";
async function run() {
  const allAlerts = await db.select().from(alerts);
  console.log(JSON.stringify(allAlerts, null, 2));
  process.exit(0);
}
run();
