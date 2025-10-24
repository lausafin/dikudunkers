// src/app/api/cron/cleanup-pending/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // ==========================================================
    // == THE DEFINITIVE FIX IS HERE ==
    // ==========================================================
    
    // 1. Get the current time inside our application code. This is our source of truth.
    const now = new Date();

    // 2. Calculate the cutoff time (1 hour ago).
    const cutoffTimestamp = new Date(now.getTime() - (60 * 60 * 1000)); // 1 hour in milliseconds

    // 3. Use this explicit timestamp as a parameter in the query.
    //    PostgreSQL's node-postgres (pg) driver will handle the timezone conversion correctly.
    //    This is far more reliable than using the database's NOW() function.
    const query = `
      UPDATE subscriptions
      SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'PENDING' AND created_at < $1
      RETURNING vipps_agreement_id;
    `;

    const result = await pool.query(query, [cutoffTimestamp]);
    
    // ==========================================================
    
    const count = result.rowCount || 0;
    const updatedIds = result.rows.map(row => row.vipps_agreement_id);

    if (count > 0) {
      console.log(`Daily cleanup: Marked ${count} old PENDING subscriptions as EXPIRED. IDs: ${updatedIds.join(', ')}`);
    } else {
      console.log(`Daily cleanup: No old PENDING subscriptions found to expire.`);
    }

    return NextResponse.json({
      message: 'Cleanup completed successfully.',
      expired_count: count,
      expired_ids: updatedIds
    });

  } catch (error) {
    console.error('Cron job (cleanup-pending) failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}