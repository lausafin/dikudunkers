// src/app/api/webhooks/vipps/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyVippsWebhook } from '@/lib/vipps-security';
import { fetchAndSaveMemberData } from '@/lib/vipps-userinfo';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    // Remember to enable verification in production!
    // const isVerified = await verifyVippsWebhook(rawBody, request.headers, request.nextUrl.pathname);
    // if (!isVerified) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    // 1. Destructure 'amount' directly from the payload to fix the ReferenceError.
    const payload = JSON.parse(rawBody);
    const { eventType, agreementId, chargeId, amount } = payload;

    console.log(`Webhook received: ${eventType} for agreement ${agreementId}, charge ${chargeId || 'N/A'}`);

    // --- AGREEMENT EVENTS ---
    if (eventType === 'recurring.agreement-activated.v1') {
      await fetchAndSaveMemberData(agreementId, pool);
    } 
    else if (eventType === 'recurring.agreement-stopped.v1' || eventType === 'recurring.agreement-expired.v1') {
      const status = eventType === 'recurring.agreement-stopped.v1' ? 'STOPPED' : 'EXPIRED';
      await pool.query(
        "UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $2",
        [status, agreementId]
      );
    }
    
    // --- CHARGE EVENTS ---
    else if (eventType.includes('charge')) {
      if (!chargeId) {
        console.warn('Received a charge event without a chargeId. Skipping.');
        return NextResponse.json({ status: 'received' });
      }

      let newStatus = '';
      switch(eventType) {
        case 'recurring.charge-failed.v1': newStatus = 'FAILED'; break;
        case 'recurring.charge-refunded.v1': newStatus = 'REFUNDED'; break;
        case 'recurring.charge-canceled.v1': newStatus = 'CANCELLED'; break;
        case 'recurring.charge-captured.v1': newStatus = 'CAPTURED'; break;
      }

      if (newStatus) {
        // 2. Find the parent subscription's internal ID to link the charge correctly.
        const subResult = await pool.query('SELECT id FROM subscriptions WHERE vipps_agreement_id = $1', [agreementId]);
        if (subResult.rows.length === 0) {
          throw new Error(`Cannot process charge webhook: No subscription found for agreementId ${agreementId}`);
        }
        const subscriptionId = subResult.rows[0].id;

        // 3. UPSERT the charge, now correctly linked to its parent subscription.
        await pool.query(
          `INSERT INTO charges (subscription_id, vipps_charge_id, status, amount_in_ore, updated_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
           ON CONFLICT (vipps_charge_id) DO UPDATE SET status = $3, updated_at = CURRENT_TIMESTAMP`,
          [subscriptionId, chargeId, newStatus, amount]
        );
      }
    }

    return NextResponse.json({ status: 'received' });

  // 4. Corrected try...catch block structure.
  } catch (error) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

