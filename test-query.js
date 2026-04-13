const { Pool } = require('pg');
const pool = new Pool(); // Picks up local socket automatically
async function test() {
  try {
    const result = await pool.query(`
      SELECT m.name, s.membership_type 
      FROM members m
      JOIN subscriptions s ON m.id = s.member_id
      WHERE s.status = 'ACTIVE'
      ORDER BY m.name ASC
    `);
    console.log(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
test();
