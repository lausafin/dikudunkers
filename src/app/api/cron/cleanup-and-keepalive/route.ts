// src/app/api/cron/cleanup-and-keepalive/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import getRedisClient from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const results = {
    db_cleanup: 'pending',
    redis_write: 'pending',
    redis_verification: 'pending', // <--- New field
    expired_count: 0,
    expired_ids: [] as string[]
  };

  try {
    // 1. Database Cleanup
    const now = new Date();
    const cutoffTimestamp = new Date(now.getTime() - (60 * 60 * 1000));
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

    // 2. Redis Keepalive + Verification
    try {
      const redis = await getRedisClient();
      
      // A. WRITE the key
      await redis.set('system:keepalive', 'ping', { EX: 60 });
      results.redis_write = 'success';

      // B. READ the key back immediately (The Proof)
      const checkValue = await redis.get('system:keepalive');
      results.redis_verification = checkValue === 'ping' ? 'VERIFIED_PING' : 'FAILED_READ';

      console.log(`[Cron] Redis status: ${results.redis_verification}`);
    } catch (redisError) {
      console.error('[Cron] Redis failed:', redisError);
      results.redis_write = 'failed';
    }

    return NextResponse.json({
      message: 'Maintenance tasks completed.',
      details: results
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: results }, { status: 500 });
  }
}