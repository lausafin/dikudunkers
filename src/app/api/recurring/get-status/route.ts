// src/app/api/recurring/get-status/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agreementId = searchParams.get('agreementId');

  if (!agreementId) {
    return NextResponse.json({ error: 'Agreement ID is required' }, { status: 400 });
  }

  try {
    // Spørg VORES EGEN database om status for denne aftale
    const result = await pool.query(
      'SELECT status FROM subscriptions WHERE vipps_agreement_id = $1',
      [agreementId]
    );

    // Hvis webhooken endnu ikke er ankommet, findes rækken ikke (eller er stadig PENDING).
    // I begge tilfælde skal frontenden vente.
    if (result.rows.length === 0) {
      return NextResponse.json({ status: 'PENDING' });
    }

    // Hvis webhooken ER ankommet, returnerer vi den korrekte status fra vores database.
    const currentStatus = result.rows[0].status;
    return NextResponse.json({ status: currentStatus });

  } catch (error) {
     console.error("Error fetching agreement status from DB:", error);
     const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
     return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}