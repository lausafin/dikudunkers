import pool from './src/lib/db.js';
(async () => {
  const result = await pool.query("SELECT COUNT(*) FROM subscriptions WHERE status = 'ACTIVE'");
  console.log(result.rows[0]);
  process.exit(0);
})();
