// src/app/api/cron/process-subscriptions/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getVippsAccessToken } from '@/lib/vipps';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Secure the endpoint (your existing code is perfect)
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log(`Daily billing check started: ${new Date().toISOString()}`);

  try {
    // 2. Determine the current billing period's start date
    const today = new Date();
    const currentYear = today.getUTCFullYear();
    
    // Define the two billing dates for the CURRENT year
    const februaryFirst = new Date(Date.UTC(currentYear, 1, 1)); // Month is 0-indexed
    const septemberFirst = new Date(Date.UTC(currentYear, 8, 1));

    // This is the core logic: Find any active subscription whose last charge date
    // is older than the most recent billing date that has passed.
    const query = `
      SELECT vipps_agreement_id, price_in_ore 
      FROM subscriptions
      WHERE status = 'ACTIVE' AND (
        -- Condition 1: It's the "Fall" season (on or after Sep 1st)
        -- and they haven't been charged since Sep 1st of this year.
        (current_date >= $1 AND last_charged_at < $1)
        OR
        -- Condition 2: It's the "Spring" season (between Feb 1st and Aug 31st)
        -- and they haven't been charged since Feb 1st of this year.
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

    // 3. Create a charge for each due subscription (your existing code is perfect)
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
        // 4. IMPORTANT: Update the last_charged_at date to today
        await pool.query(
          "UPDATE subscriptions SET last_charged_at = current_date WHERE vipps_agreement_id = $1",
          [vipps_agreement_id]
        );
        return { success: true, agreementId: vipps_agreement_id };
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