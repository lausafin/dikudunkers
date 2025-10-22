// src/app/api/recurring/get-status/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getVippsAccessToken } from '@/lib/vipps';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agreementId = searchParams.get('agreementId');

  if (!agreementId) {
    return NextResponse.json({ error: 'Agreement ID is required' }, { status: 400 });
  }

  try {
    // Trin 1: Tjek vores egen database først for en hurtig respons.
    const dbResult = await pool.query(
      'SELECT status FROM subscriptions WHERE vipps_agreement_id = $1',
      [agreementId]
    );

    const localStatus = dbResult.rows[0]?.status;

    // Hvis status allerede er 'ACTIVE' (opdateret af webhook), kan vi stoppe her.
    if (localStatus && localStatus !== 'PENDING') {
      return NextResponse.json({ status: localStatus });
    }

    // Trin 2: Hvis status er PENDING (eller ukendt), spørg Vipps direkte.
    // Dette løser race condition, hvor polling er hurtigere end webhook'en.
    console.log(`Local status is PENDING for ${agreementId}. Polling Vipps directly.`);
    const accessToken = await getVippsAccessToken();
    const vippsResponse = await fetch(`${process.env.VIPPS_API_BASE_URL}/recurring/v3/agreements/${agreementId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
        'Merchant-Serial-Number': process.env.VIPPS_MSN!,
      },
    });

    if (!vippsResponse.ok) {
      // Hvis Vipps ikke kan finde aftalen, er den sandsynligvis stadig ved at blive oprettet.
      console.error(`Polling Vipps for ${agreementId} failed with status: ${vippsResponse.status}`);
      return NextResponse.json({ status: 'PENDING' });
    }

    const vippsData = await vippsResponse.json();
    const realStatus = vippsData.status;

    // Bonus: Hvis vi opdager, at aftalen er blevet aktiv, kan vi opdatere vores egen database
    // for at "selv-hele" systemet, i tilfælde af at webhook'en skulle fejle eller blive forsinket.
    if (realStatus === 'ACTIVE' && localStatus === 'PENDING') {
      console.log(`Polling detected status change to ACTIVE for ${agreementId}. Updating local DB.`);
      // Vi opdaterer kun status her. Brugerdata-oprettelsen overlades til webhook'en.
      await pool.query(
        "UPDATE subscriptions SET status = 'ACTIVE' WHERE vipps_agreement_id = $1",
        [agreementId]
      );
    }
    
    // Returner den rigtige, real-time status fra Vipps.
    return NextResponse.json({ status: realStatus });

  } catch (error) {
     console.error("Error in get-status endpoint:", error);
     const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
     return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}