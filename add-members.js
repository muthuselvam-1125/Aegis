const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgre@localhost:5432/aiges' });

pool.query(`
  INSERT INTO members (name, role, place_id, status, user_id) 
  VALUES 
    ('Muthuselvam', 'adult', 10, 'safe', 4), 
    ('Rohith', 'adult', 11, 'unknown', 4)
`)
.then(() => console.log('Added members'))
.catch(console.error)
.finally(() => pool.end());
