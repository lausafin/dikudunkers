// src/app/api/recurring/get-status/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getVippsAccessToken } from '@/lib/vipps';

// DENNE LINJE ER LØSNINGEN:
// Fortæller Vercel/Next.js, at denne route er fuldt dynamisk og aldrig må caches.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agreementId = searchParams.get('agreementId');

  if (!agreementId) {
    return NextResponse.json({ error: 'Agreement ID is required' }, { status: 400 });
  }

  try {
    // Trin 1: Tjek vores egen database først. Det er hurtigt.
    const dbResult = await pool.query(
      'SELECT status FROM subscriptions WHERE vipps_agreement_id = $1',
      [agreementId]
    );

    const localStatus = dbResult.rows[0]?.status;

    // Hvis webhook'en allerede har kørt, er vi færdige.
    if (localStatus === 'ACTIVE' || localStatus === 'STOPPED' || localStatus === 'EXPIRED') {
      return NextResponse.json({ status: localStatus });
    }

    // Trin 2: Hvis vi er her, er status enten PENDING eller rækken findes ikke.
    // Spørg Vipps direkte for at få den endelige sandhed.
    console.log(`Local status not final for ${agreementId}. Polling Vipps API directly.`);
    
    const accessToken = await getVippsAccessToken();
    const vippsResponse = await fetch(`${process.env.VIPPS_API_BASE_URL}/recurring/v3/agreements/${agreementId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
        'Merchant-Serial-Number': process.env.VIPPS_MSN!,
      },
      // Tilføj denne cache-option for at sikre, at selv fetch-kaldet ikke caches
      cache: 'no-store',
    });

    if (!vippsResponse.ok) {
      return NextResponse.json({ status: 'PENDING' });
    }

    const vippsData = await vippsResponse.json();
    
    return NextResponse.json({ status: vippsData.status });

  } catch (error) {
     console.error("Error in get-status endpoint:", error);
     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}