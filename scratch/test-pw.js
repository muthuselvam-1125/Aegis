const { Pool } = require('pg');
const tryConnect = async (pw) => {
  const p = new Pool({connectionString: `postgresql://postgres:${pw}@localhost:5432/postgres`});
  try {
    await p.query('SELECT 1');
    console.log('SUCCESS with password:', pw);
    
    // Also list databases to see what's available
    const dbs = await p.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
    console.log('Databases:', dbs.rows.map(r => r.datname));
    
    return true;
  } catch(e) {
    console.log('FAIL with password:', pw, e.message);
    return false;
  } finally {
    await p.end();
  }
};
(async () => {
  await tryConnect('postgres');
  await tryConnect('postgre');
  await tryConnect('admin');
  await tryConnect('');
})();
