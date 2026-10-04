const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgre@localhost:5432/AIGES' });
pool.query('SELECT NOW()')
  .then(res => { console.log('Connected successfully:', res.rows); pool.end(); })
  .catch(err => { console.error('Connection error:', err.message); pool.end(); });
