const { Pool } = require('pg');
require('dotenv').config();

async function deleteData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgre@localhost:5432/aiges",
  });

  try {
    console.log("Connecting to database...");
    await pool.query('BEGIN');
    
    // Delete user related data
    console.log("Deleting password_resets...");
    await pool.query('DELETE FROM password_resets');
    
    console.log("Deleting members...");
    await pool.query('DELETE FROM members');
    
    console.log("Deleting places (location data)...");
    await pool.query('DELETE FROM places');
    
    console.log("Deleting users...");
    await pool.query('DELETE FROM users');
    
    await pool.query('COMMIT');
    console.log("Successfully deleted user and location data!");
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("Error deleting data:", error);
  } finally {
    await pool.end();
  }
}

deleteData();
