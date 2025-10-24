// src/app/api/recurring/get-status-by-temp-id/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { kv } from '@vercel/kv'; // <-- Import Vercel KV

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tempId = searchParams.get('temp_id');

  if (!tempId) {
    return NextResponse.json({ error: 'temp_id is required' }, { status: 400 });
  }

  try {
    // First, find the real agreementId using the tempId
    const subIdResult = await pool.query(
      'SELECT vipps_agreement_id FROM subscriptions WHERE temp_redirect_id = $1',
      [tempId]
    );
    const agreementId = subIdResult.rows[0]?.vipps_agreement_id;

    if (!agreementId) {
      // If we can't even find the initial record, it's definitely pending.
      return NextResponse.json({ status: 'PENDING' });
    }

    // ==========================================================
    // == THE NEW HIGH-SPEED CHECK ==
    // ==========================================================
    // 1. Check the lightning-fast KV store for the status flag.
    const kvStatus = await kv.get(`status:${agreementId}`);
    if (kvStatus === 'ACTIVE') {
      console.log(`[KV HIT] Found ACTIVE status for ${agreementId} in KV store.`);
      return NextResponse.json({ status: 'ACTIVE' });
    }
    // ==========================================================

    // 2. FALLBACK: If the flag isn't in KV, check the durable database.
    //    This handles the case where the user polls *before* the webhook has fired.
    const dbResult = await pool.query(
      'SELECT status FROM subscriptions WHERE vipps_agreement_id = $1',
      [agreementId]
    );
    const status = dbResult.rows[0]?.status || 'PENDING';
    return NextResponse.json({ status });

  } catch (error) {
    // Graceful failure still returns PENDING
    return NextResponse.json({ status: 'PENDING' });
  }
}