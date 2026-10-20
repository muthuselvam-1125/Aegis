const { Pool } = require('pg');
require('dotenv').config();

async function inspectData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const usersRes = await pool.query("SELECT id, email, name FROM users;");
    const placesRes = await pool.query("SELECT id, name, lat, lon, user_id FROM places;");
    console.log("USERS IN NEON:", usersRes.rows);
    console.log("PLACES IN NEON:", placesRes.rows);
  } catch (err) {
    console.error("Query error:", err);
  } finally {
    await pool.end();
  }
}

inspectData();
