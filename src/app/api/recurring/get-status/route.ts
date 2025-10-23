// src/app/api/recurring/get-status/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// This is still important to prevent aggressive caching.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agreementId = searchParams.get('agreementId');

  if (!agreementId) {
    return NextResponse.json({ error: 'Agreement ID is required' }, { status: 400 });
  }

  try {
    const dbResult = await pool.query(
      'SELECT status FROM subscriptions WHERE vipps_agreement_id = $1',
      [agreementId]
    );

    // If the webhook hasn't created the row yet, or it's still pending,
    // gracefully return 'PENDING'.
    const status = dbResult.rows[0]?.status || 'PENDING';

    return NextResponse.json({ status });

  } catch (error) {
    // If the database has a transient error, DO NOT fail the request.
    // Instead, tell the frontend to just keep trying. The webhook will eventually succeed.
    console.warn(`Transient error in get-status for ${agreementId}. Returning PENDING.`, error);
    return NextResponse.json({ status: 'PENDING' });
  }
}