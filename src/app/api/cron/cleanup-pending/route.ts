// src/app/api/cron/cleanup-pending/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Secure the endpoint
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // We are looking for records that are still 'PENDING' and are older than 24 hours.
    // The Vipps 10-minute window is long past, so these are definitively abandoned.
    const query = `
      UPDATE subscriptions
      SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '24 hours'
      RETURNING id;
    `;

    const result = await pool.query(query);

    const count = result.rowCount || 0;
    console.log(`Daily cleanup: Found and marked ${count} old PENDING subscriptions as EXPIRED.`);

    return NextResponse.json({
      message: 'Cleanup completed successfully.',
      expired_count: count
    });

  } catch (error) {
    console.error('Cron job (cleanup-pending) failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}