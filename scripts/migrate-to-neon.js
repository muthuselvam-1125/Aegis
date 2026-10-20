const { Pool } = require('pg');
require('dotenv').config();

async function migrate() {
  const localPool = new Pool({
    connectionString: 'postgresql://postgres:postgre@localhost:5432/aiges',
    connectionTimeoutMillis: 3000
  });

  const neonPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Reading data from local database...");
    const users = (await localPool.query("SELECT * FROM users")).rows;
    const places = (await localPool.query("SELECT * FROM places")).rows;
    const members = (await localPool.query("SELECT * FROM members")).rows;

    console.log(`Found ${users.length} users, ${places.length} places, ${members.length} members.`);

    console.log("Migrating users to Neon...");
    for (const u of users) {
      await neonPool.query(`
        INSERT INTO users (id, email, password_hash, name, avatar_url, is_verified, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          avatar_url = EXCLUDED.avatar_url;
      `, [u.id, u.email, u.password_hash, u.name, u.avatar_url, u.is_verified, u.created_at]);
    }
    // Update serial sequence for users
    if (users.length > 0) {
      await neonPool.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));");
    }

    console.log("Migrating places to Neon...");
    for (const p of places) {
      await neonPool.query(`
        INSERT INTO places (id, name, label, lat, lon, region, country, authority, authority_url, elevation_m, coastal_km, flood_history, is_primary, created_at, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          lat = EXCLUDED.lat,
          lon = EXCLUDED.lon,
          user_id = EXCLUDED.user_id;
      `, [p.id, p.name, p.label, p.lat, p.lon, p.region, p.country, p.authority, p.authority_url, p.elevation_m, p.coastal_km, p.flood_history, p.is_primary, p.created_at, p.user_id]);
    }
    if (places.length > 0) {
      await neonPool.query("SELECT setval('places_id_seq', (SELECT MAX(id) FROM places));");
    }

    console.log("Migrating members to Neon...");
    for (const m of members) {
      await neonPool.query(`
        INSERT INTO members (id, name, role, place_id, status, status_note, blood_type, allergies, medical, emergency_contact, last_check_in, user_id, last_lat, last_lon)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING;
      `, [m.id, m.name, m.role, m.place_id, m.status, m.status_note, m.blood_type, m.allergies, m.medical, m.emergency_contact, m.last_check_in, m.user_id, m.last_lat, m.last_lon]);
    }
    if (members.length > 0) {
      await neonPool.query("SELECT setval('members_id_seq', (SELECT MAX(id) FROM members));");
    }

    console.log("✅ Successfully migrated user data, places, and members to Neon cloud database!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

migrate();
