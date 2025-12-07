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
    // 1. Lookup subscription by temp ID (Source of Truth #1)
    // This MUST happen first to get the real Agreement ID.
    const subIdResult = await pool.query(
      'SELECT vipps_agreement_id FROM subscriptions WHERE temp_redirect_id = $1',
      [tempId]
    );
    const agreementId = subIdResult.rows[0]?.vipps_agreement_id;

    // If we don't even have an agreement ID yet, it's definitely PENDING.
    if (!agreementId) return NextResponse.json({ status: 'PENDING' });

    // ==========================================================
    // 2. High-speed Redis check (Optimistic)
    // ==========================================================
    try {
      // TEMP: SABOTAGE LINE - UNCOMMENT TO TEST FALLBACK
      throw new Error("Simulating Redis Explosion"); 
      // We wrap this in its OWN try/catch so it can fail without killing the request.
      // We also race it against a 500ms timeout. If Redis is slow, we skip it.
      const redisPromise = async () => {
         const redis = await getRedisClient();
         return await redis.get(`status:${agreementId}`);
      };

      const timeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 500)
      );

      const redisStatus = await Promise.race([redisPromise(), timeoutPromise]);

      if (redisStatus === 'ACTIVE') {
        // console.log(`[Redis HIT] Found ACTIVE status for ${agreementId}`);
        return NextResponse.json({ status: 'ACTIVE' });
      }
    } catch (redisError) {
      // If Redis fails, is deleted, or times out, we just log a warning and CONTINUE.
      console.warn("Redis check failed or timed out. Falling back to DB.", redisError);
    }
    // ==========================================================


    // 3. Fallback: Check database (Source of Truth #2)
    // This now runs even if Redis crashed above.
    const dbResult = await pool.query(
      'SELECT status FROM subscriptions WHERE vipps_agreement_id = $1',
      [agreementId]
    );
    const status = dbResult.rows[0]?.status || 'PENDING';
    
    return NextResponse.json({ status });

  } catch (error) {
    // This catch block handles DATABASE errors (the critical ones).
    console.error("Error in get-status-by-temp-id:", error);
    return NextResponse.json({ status: 'PENDING' });
  }
}