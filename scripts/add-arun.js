require('dotenv').config({path: '.env.local'}); 
require('dotenv').config({path: '.env'}); 
const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: process.env.DATABASE_URL }); 
pool.query("INSERT INTO members (name, role, place_id, status, status_note, blood_type, allergies, medical, emergency_contact, user_id) VALUES ('Arunkumar', 'adult', 12, 'safe', '', '', '', '', '', 4)")
  .then(() => { console.log('Added Arunkumar'); pool.end(); })
  .catch(err => { console.error(err); pool.end(); });
