const { Pool } = require('pg');
require('dotenv').config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log("SUCCESS! Tables in Neon PostgreSQL:");
    res.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.table_name}`);
    });
  } catch (err) {
    console.error("Failed to query Neon tables:", err);
  } finally {
    await pool.end();
  }
}

check();
