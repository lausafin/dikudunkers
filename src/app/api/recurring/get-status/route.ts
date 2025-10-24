// src/app/api/recurring/get-status-by-temp-id/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tempId = searchParams.get('temp_id');

  if (!tempId) {
    return NextResponse.json({ error: 'temp_id is required' }, { status: 400 });
  }

  try {
    // Find the subscription using the reliable temp_id
    const dbResult = await pool.query(
      'SELECT status FROM subscriptions WHERE temp_redirect_id = $1',
      [tempId]
    );

    const status = dbResult.rows[0]?.status || 'PENDING';
    return NextResponse.json({ status });

  } catch (error) {
    console.warn(`Transient error in get-status-by-temp-id for ${tempId}. Returning PENDING.`, error);
    return NextResponse.json({ status: 'PENDING' });
  }
}