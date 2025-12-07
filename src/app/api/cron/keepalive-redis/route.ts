// src/app/api/cron/keepalive-redis/route.ts
import { NextResponse } from 'next/server';
import getRedisClient from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Security Check
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const redis = await getRedisClient();

    // 2. Write a key with a short expiration (60 seconds)
    // This counts as a "Write" operation to keep the DB alive.
    // Using 'EX' automatically deletes it, so we don't need a separate delete command.
    await redis.set('system:keepalive', 'ping', { EX: 60 });

    console.log(`[Cron] Redis keepalive ping successful: ${new Date().toISOString()}`);

    return NextResponse.json({ status: 'ok', message: 'Redis pinged' });
  } catch (error) {
    console.error('[Cron] Redis keepalive failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}