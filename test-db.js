require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    const res1 = await pool.query('SELECT COUNT(*) FROM members');
    console.log('Total members:', res1.rows[0].count);
    
    const res2 = await pool.query('SELECT COUNT(*) FROM subscriptions');
    console.log('Total subscriptions:', res2.rows[0].count);

    const res3 = await pool.query("SELECT COUNT(*) FROM subscriptions WHERE status = 'ACTIVE'");
    console.log('Active subscriptions (status = ACTIVE):', res3.rows[0].count);
    
    const res4 = await pool.query(`
      SELECT m.name, s.membership_type, s.status
      FROM members m
      JOIN subscriptions s ON m.id = s.member_id
    `);
    console.log('All joined records:', res4.rows);

  } catch (err) {
    console.error('DB Error:', err.message);
  } finally {
    pool.end();
  }
}
run();
