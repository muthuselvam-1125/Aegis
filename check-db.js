const { Pool } = require('pg');
require('dotenv').config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgre@localhost:5432/aiges",
  });

  try {
    const alerts = await pool.query('SELECT * FROM alerts');
    console.log("ALERTS:", alerts.rows);

    const places = await pool.query('SELECT * FROM places');
    console.log("PLACES:", places.rows);
  } finally {
    await pool.end();
  }
}
check();
