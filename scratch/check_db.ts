import { db } from "../src/db/index.js";
import { users } from "../src/db/schema.js";

async function check() {
  try {
    const allUsers = await db.select().from(users);
    console.log("DB USERS:");
    console.log(allUsers);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
check();
