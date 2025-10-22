// src/app/api/webhooks/vipps/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyVippsWebhook } from '@/lib/vipps-security';
import { fetchAndSaveMemberData } from '@/lib/vipps-userinfo'; 

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const isVerified = await verifyVippsWebhook(rawBody, request.headers, request.nextUrl.pathname);
    if (!isVerified) {
      return new Response('Unauthorized: Signature verification failed', { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const { eventType, agreementId, chargeId, chargeType } = payload; // Få 'chargeType' fra payload

    console.log(`Webhook received: ${eventType} for agreement ${agreementId}, charge ${chargeId}`);

    switch (eventType) {
      // The Single Source of Truth for a new subscription. This is our main fulfillment trigger.
      case 'recurring.agreement-activated.v1':
        await fetchAndSaveMemberData(agreementId, pool);
        break;

      // Handle future charge events from our Cron Job
      case 'recurring.charge-captured.v1':
        // We ONLY care about recurring charges here. Initial charges are handled by agreement-activated.
        if (chargeType === 'RECURRING') {
          await pool.query(
            "UPDATE subscriptions SET last_charged_at = current_date WHERE vipps_agreement_id = $1",
            [agreementId]
          );
          console.log(`Updated last_charged_at for RECURRING charge on agreement ${agreementId}`);
        } else {
          console.log(`Ignoring 'charge-captured' for an '${chargeType || 'UNKNOWN'}' charge type.`);
        }
        break;
        
      // Handle cancellations
      case 'recurring.agreement-stopped.v1':
      case 'recurring.agreement-expired.v1':
        const status = eventType === 'recurring.agreement-stopped.v1' ? 'STOPPED' : 'EXPIRED';
        await pool.query(
          "UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $2",
          [status, agreementId]
        );
        break;
        
      default:
        console.log(`Ignoring unhandled event type: ${eventType}`);
        break;
    }
    
    return NextResponse.json({ status: 'received' });

  } catch (error) {
    console.error("Webhook processing error:", error);
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}