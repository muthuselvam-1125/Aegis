const { Pool } = require('pg');
require('dotenv').config();

async function resetUserData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgre@localhost:5432/aiges",
  });

  try {
    console.log("Connecting to PostgreSQL database...");
    
    // Check counts before deletion
    const usersBefore = await pool.query('SELECT count(*) FROM users');
    const membersBefore = await pool.query('SELECT count(*) FROM members');
    const placesBefore = await pool.query('SELECT count(*) FROM places');
    const alertsBefore = await pool.query('SELECT count(*) FROM alerts');
    const resetsBefore = await pool.query('SELECT count(*) FROM password_resets');

    console.log("=== BEFORE DELETION ===");
    console.log(`Users: ${usersBefore.rows[0].count}`);
    console.log(`Members: ${membersBefore.rows[0].count}`);
    console.log(`Places: ${placesBefore.rows[0].count}`);
    console.log(`Alerts: ${alertsBefore.rows[0].count}`);
    console.log(`Password Resets: ${resetsBefore.rows[0].count}`);

    await pool.query('BEGIN');

    console.log("\nDeleting user details and associated data...");
    await pool.query('DELETE FROM password_resets');
    await pool.query('DELETE FROM members');
    await pool.query('DELETE FROM alerts');
    await pool.query('DELETE FROM places');
    await pool.query('DELETE FROM users');

    await pool.query('COMMIT');
    console.log("✅ Successfully deleted all user data!\n");

    // Check counts after deletion
    const usersAfter = await pool.query('SELECT count(*) FROM users');
    const membersAfter = await pool.query('SELECT count(*) FROM members');
    const placesAfter = await pool.query('SELECT count(*) FROM places');
    const alertsAfter = await pool.query('SELECT count(*) FROM alerts');
    const resetsAfter = await pool.query('SELECT count(*) FROM password_resets');

    console.log("=== AFTER DELETION ===");
    console.log(`Users: ${usersAfter.rows[0].count}`);
    console.log(`Members: ${membersAfter.rows[0].count}`);
    console.log(`Places: ${placesAfter.rows[0].count}`);
    console.log(`Alerts: ${alertsAfter.rows[0].count}`);
    console.log(`Password Resets: ${resetsAfter.rows[0].count}`);

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("❌ Error deleting data:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetUserData();
