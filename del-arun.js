require('dotenv').config({path: '.env.local'}); 
require('dotenv').config({path: '.env'}); 
const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: process.env.DATABASE_URL }); 
pool.query("DELETE FROM members WHERE name = 'Arunkumar'")
  .then(() => pool.query("DELETE FROM places WHERE name LIKE '%Sivakasi%'"))
  .then(() => { console.log('Deleted Arunkumar and Sivakasi'); pool.end(); })
  .catch(err => { console.error(err); pool.end(); });
