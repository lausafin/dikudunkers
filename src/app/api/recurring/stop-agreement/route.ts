// src/app/api/recurring/stop-agreement/route.ts
import { NextResponse } from 'next/server';
import { getVippsAccessToken } from '@/lib/vipps';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  const { agreementId } = await request.json();

  try {
    const accessToken = await getVippsAccessToken();
    const response = await fetch(`${process.env.VIPPS_API_BASE_URL}/recurring/v3/agreements/${agreementId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
        'Merchant-Serial-Number': process.env.VIPPS_MSN!,
        'Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify({ status: "STOPPED" }),
    });

    if (!response.ok) {
      throw new Error('Failed to stop agreement with Vipps.');
    }

    // Also update our own database
    await pool.query(
      "UPDATE subscriptions SET status = 'STOPPED' WHERE vipps_agreement_id = $1",
      [agreementId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}