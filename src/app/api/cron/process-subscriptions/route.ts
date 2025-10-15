// src/app/api/cron/process-subscriptions/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getVippsAccessToken } from '@/lib/vipps';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Secure the endpoint
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Check if today is a billing day (Feb 1st or Sep 1st)
  const today = new Date();
  const month = today.getUTCMonth(); // 0-indexed: Jan=0, Feb=1, ..., Sep=8
  const day = today.getUTCDate();

  // Billing months are February (1) and September (8)
  // const isBillingDay = (month === 1 && day === 1) || (month === 8 && day === 1);

  // --- FOR TESTING: UNCOMMENT THE LINE BELOW TO FORCE A BILLING DAY ---
  const isBillingDay = true; 

  if (!isBillingDay) {
    return NextResponse.json({ message: 'Not a billing day. No action taken.' });
  }
  
  console.log(`Billing day detected: ${today.toISOString()}. Processing subscriptions.`);

  try {
    // 3. Find all active subscriptions that haven't already been charged today
    const result = await pool.query(
      `SELECT vipps_agreement_id, price_in_ore FROM subscriptions 
       WHERE status = 'ACTIVE' AND (last_charged_at IS NULL OR last_charged_at < current_date)`
    );
    const subscriptionsToCharge = result.rows;

    if (subscriptionsToCharge.length === 0) {
      return NextResponse.json({ message: 'No active subscriptions to process today.' });
    }

    const accessToken = await getVippsAccessToken();
    
    // 4. Create a charge for each subscription
    const chargePromises = subscriptionsToCharge.map(async (sub) => {
      const { vipps_agreement_id, price_in_ore } = sub;
      
      const due = new Date();
      due.setDate(due.getDate() + 2); // Charge is due in 2 days
      const dueDateString = due.toISOString().split('T')[0];

      const chargePayload = {
        amount: price_in_ore,
        description: `Medlemskab forfald ${dueDateString}`,
        due: dueDateString,
        retryDays: 5,
        transactionType: "DIRECT_CAPTURE",
        orderId: `charge-${vipps_agreement_id.replace('_', '-')}-${dueDateString}`
      };

      const response = await fetch(`${process.env.VIPPS_API_BASE_URL}/recurring/v3/agreements/${vipps_agreement_id}/charges`, {
        method: 'POST',
        headers: {
          // ===== THIS IS THE CORRECTED PART =====
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
          'Merchant-Serial-Number': process.env.VIPPS_MSN!,
          'Idempotency-Key': uuidv4(),
          // =====================================
        },
        body: JSON.stringify(chargePayload),
      });

      if (response.ok) {
        // 5. IMPORTANT: Update the last_charged_at date upon success
        await pool.query(
          "UPDATE subscriptions SET last_charged_at = current_date WHERE vipps_agreement_id = $1",
          [vipps_agreement_id]
        );
        return { success: true, agreementId: vipps_agreement_id };
      } else {
        console.error(`Failed to create charge for ${vipps_agreement_id}:`, await response.text());
        return { success: false, agreementId: vipps_agreement_id };
      }
    });

    const results = await Promise.all(chargePromises);
    return NextResponse.json({ message: 'Billing process completed.', results });

  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}