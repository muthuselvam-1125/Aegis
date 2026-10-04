require('dotenv').config({path: '.env.local'});
require('dotenv').config({path: '.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/app_db' });

async function clearData() {
  try {
    await pool.query("DELETE FROM password_resets");
    await pool.query("DELETE FROM users");
    await pool.query("DELETE FROM members");
    await pool.query("DELETE FROM alerts");
    await pool.query("DELETE FROM places");
    
    console.log("Successfully deleted user and location data.");
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

clearData();
