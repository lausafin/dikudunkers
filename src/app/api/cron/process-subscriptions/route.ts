// src/app/api/cron/process-subscriptions/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getVippsAccessToken } from '@/lib/vipps';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log(`Daily billing check started: ${new Date().toISOString()}`);

  try {
    const today = new Date();
    const currentYear = today.getUTCFullYear();
    const februaryFirst = new Date(Date.UTC(currentYear, 1, 1));
    const septemberFirst = new Date(Date.UTC(currentYear, 8, 1));

    const query = `
      SELECT vipps_agreement_id, price_in_ore 
      FROM subscriptions
      WHERE status = 'ACTIVE' AND (
        (current_date >= $1 AND last_charged_at < $1)
        OR
        (current_date >= $2 AND current_date < $1 AND last_charged_at < $2)
      )
    `;

    const result = await pool.query(query, [septemberFirst, februaryFirst]);
    const subscriptionsToCharge = result.rows;

    if (subscriptionsToCharge.length === 0) {
      return NextResponse.json({ message: 'No subscriptions due for billing today.' });
    }

    console.log(`Found ${subscriptionsToCharge.length} subscriptions to charge.`);
    const accessToken = await getVippsAccessToken();

    const chargePromises = subscriptionsToCharge.map(async (sub) => {
      const { vipps_agreement_id, price_in_ore } = sub;
      
      const due = new Date();
      due.setDate(due.getDate() + 2);
      const dueDateString = due.toISOString().split('T')[0];

      const chargePayload = {
        amount: price_in_ore,
        description: `Medlemskab DIKU Dunkers`,
        due: dueDateString,
        retryDays: 5,
        transactionType: "DIRECT_CAPTURE" as const,
        orderId: `charge-${vipps_agreement_id.replace('_', '-')}-${dueDateString}`
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

      if (response.ok) {
        console.log(`Successfully created charge ${chargePayload.orderId} for agreement ${vipps_agreement_id} at Vipps.`);
        try {
          await pool.query(
            "UPDATE subscriptions SET last_charged_at = current_date WHERE vipps_agreement_id = $1",
            [vipps_agreement_id]
          );
          return { success: true, agreementId: vipps_agreement_id };
        } catch (dbError) {
          console.error(`CRITICAL DB_UPDATE_FAILED: Charge created for ${vipps_agreement_id}, but failed to update last_charged_at. Manual intervention required.`, dbError);
          return { success: false, agreementId: vipps_agreement_id, error: 'DB_UPDATE_FAILED' };
        }
      } else {
        console.error(`Failed to create charge for ${vipps_agreement_id}:`, await response.text());
        return { success: false, agreementId: vipps_agreement_id, error: await response.text() };
      }
    }); 

    const results = await Promise.all(chargePromises);
    return NextResponse.json({ message: 'Billing process completed.', results });

  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}