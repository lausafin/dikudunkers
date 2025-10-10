// src/app/api/user/subscription/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  // In a real app, get user ID from session/authentication
  const userId = 1;
  
  const result = await pool.query(
    'SELECT status, vipps_agreement_id FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}