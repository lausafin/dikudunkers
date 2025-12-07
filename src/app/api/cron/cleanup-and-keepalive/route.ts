// src/app/api/cron/cleanup-and-keepalive/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import getRedisClient from '@/lib/redis'; // <--- Import Redis

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const results = {
    db_cleanup: 'pending',
    redis_keepalive: 'pending',
    expired_count: 0,
    expired_ids: [] as string[]
  };

  try {
    // ==========================================================
    // TASK 1: DATABASE CLEANUP
    // ==========================================================
    const now = new Date();
    const cutoffTimestamp = new Date(now.getTime() - (60 * 60 * 1000)); // 1 hour ago

    const query = `
      UPDATE subscriptions
      SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'PENDING' AND created_at < $1
      RETURNING vipps_agreement_id;
    `;

    const dbResult = await pool.query(query, [cutoffTimestamp]);
    
    results.expired_count = dbResult.rowCount || 0;
    results.expired_ids = dbResult.rows.map(row => row.vipps_agreement_id);
    results.db_cleanup = 'success';

    if (results.expired_count > 0) {
      console.log(`Daily cleanup: Marked ${results.expired_count} old PENDING subscriptions as EXPIRED.`);
    }

    // ==========================================================
    // TASK 2: REDIS KEEPALIVE
    // ==========================================================
    try {
      const redis = await getRedisClient();
      // Write a key that expires in 60 seconds.
      // This counts as a "Write Operation" to reset the 30-day timer.
      await redis.set('system:keepalive', 'ping', { EX: 60 });
      results.redis_keepalive = 'success';
      console.log('[Cron] Redis keepalive ping successful.');
    } catch (redisError) {
      console.error('[Cron] Redis keepalive failed:', redisError);
      results.redis_keepalive = 'failed';
      // We do NOT throw here. We want the response to return successfully 
      // even if Redis is down, because the DB cleanup might have succeeded.
    }

    return NextResponse.json({
      message: 'Maintenance tasks completed.',
      details: results
    });

  } catch (error) {
    console.error('Cron job (cleanup-pending) failed:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: results }, { status: 500 });
  }
}