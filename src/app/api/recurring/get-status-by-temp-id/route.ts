// src/app/api/recurring/get-status-by-temp-id/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import getRedisClient from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tempId = searchParams.get('temp_id');

  if (!tempId) {
    return NextResponse.json({ error: 'temp_id is required' }, { status: 400 });
  }

  try {
    // 1. Lookup subscription by temp ID
    const subIdResult = await pool.query(
      'SELECT vipps_agreement_id FROM subscriptions WHERE temp_redirect_id = $1',
      [tempId]
    );
    const agreementId = subIdResult.rows[0]?.vipps_agreement_id;
    if (!agreementId) return NextResponse.json({ status: 'PENDING' });

    // 2. High-speed Redis check
    const redis = await getRedisClient();
    const redisStatus = await redis.get(`status:${agreementId}`);
    if (redisStatus === 'ACTIVE') {
      console.log(`[Redis HIT] Found ACTIVE status for ${agreementId} in Redis.`);
      return NextResponse.json({ status: 'ACTIVE' });
    }

    // 3. Fallback: Check database
    const dbResult = await pool.query(
      'SELECT status FROM subscriptions WHERE vipps_agreement_id = $1',
      [agreementId]
    );
    const status = dbResult.rows[0]?.status || 'PENDING';
    return NextResponse.json({ status });

  } catch (error) {
    console.error("Error in get-status-by-temp-id:", error);
    return NextResponse.json({ status: 'PENDING' });
  }
}
