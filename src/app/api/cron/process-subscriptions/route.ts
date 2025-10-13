// src/app/api/cron/process-subscriptions/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getVippsAccessToken } from '@/lib/vipps';
import { v4 as uuidv4 } from 'uuid';

// Vercel requires this for cron jobs
export const dynamic = 'force-dynamic'; 

export async function GET(request: Request) {
  // Secure the endpoint so only Vercel can run it
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // This query now selects active users who were last charged more than 28 days ago,
    // or who have never been charged (for their first payment after activation).
    const query = `
      SELECT vipps_agreement_id FROM subscriptions 
      WHERE status = 'ACTIVE' 
      AND (last_charged_at IS NULL OR last_charged_at <= current_date - interval '28 days')
    `;
    const result = await pool.query(query);
    const activeSubscriptions = result.rows;

    if (activeSubscriptions.length === 0) {
      return NextResponse.json({ message: 'No active subscriptions to process.' });
    }

    const accessToken = await getVippsAccessToken();
    const chargePromises = activeSubscriptions.map(async (sub) => {
      const { vipps_agreement_id } = sub;
      const due = new Date();
      due.setDate(due.getDate() + 2); // Charge is due in 2 days
      const dueDateString = due.toISOString().split('T')[0]; // Format as "YYYY-MM-DD"

      const chargePayload = {
        amount: 29900, // Amount in øre
        description: `Monthly subscription for ${dueDateString.slice(0, 7)}`,
        due: dueDateString,
        retryDays: 2,
        transactionType: "DIRECT_CAPTURE",
        orderId: `charge-${vipps_agreement_id}-${dueDateString}`
      };

      const response = await fetch(`${process.env.VIPPS_API_BASE_URL}/recurring/v3/agreements/${vipps_agreement_id}/charges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
          'Merchant-Serial-Number': process.env.VIPPS_MSN!,
          'Idempotency-Key': uuidv4(),
        },
        body: JSON.stringify(chargePayload),
      });

      if (!response.ok) {
        console.error(`Failed to create charge for ${vipps_agreement_id}:`, await response.text());
        return { success: false, agreementId: vipps_agreement_id };
      }
      return { success: true, agreementId: vipps_agreement_id };
    });

    const results = await Promise.all(chargePromises);
    return NextResponse.json({ results });

  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}