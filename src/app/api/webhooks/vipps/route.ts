// src/app/api/webhooks/vipps/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyVippsWebhook } from '@/lib/vipps-security';
import { fetchAndSaveMemberData } from '@/lib/vipps-userinfo';

export async function POST(request: NextRequest) {
  try {
    // RETTELSE 1: Læs body som tekst én gang.
    const rawBody = await request.text();

    // HUSK AT FJERNE KOMMENTERING I PRODUKTION!
    const isVerified = await verifyVippsWebhook(rawBody, request.headers, request.nextUrl.pathname);
    if (!isVerified) {
      console.warn('Webhook verification failed!');
      return new Response('Unauthorized: Signature verification failed', { status: 401 });
    }

    // RETTELSE 1 (fortsat): Parse den rå tekst i stedet for at kalde request.json().
    const payload = JSON.parse(rawBody);
    const { eventType, agreementId, chargeId, chargeType, amount } = payload;

    console.log(`Webhook received: ${eventType} for agreement ${agreementId}, charge ${chargeId}`);

    switch (eventType) {
      case 'recurring.agreement-activated.v1':
        await fetchAndSaveMemberData(agreementId, pool);
        break;

      case 'recurring.agreement-stopped.v1':
        await pool.query(
          "UPDATE subscriptions SET status = 'STOPPED', updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $1",
          [agreementId]
        );
        break;

      case 'recurring.agreement-expired.v1':
        await pool.query(
          "UPDATE subscriptions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $1",
          [agreementId]
        );
        break;

      case 'recurring.charge-captured.v1':
        const subResult = await pool.query(
          'SELECT id FROM subscriptions WHERE vipps_agreement_id = $1',
          [agreementId]
        );
        
        if (subResult.rows.length > 0) {
          const subscriptionId = subResult.rows[0].id;

          await pool.query(
            `INSERT INTO charges (subscription_id, vipps_charge_id, status, amount_in_ore, charge_type)
             VALUES ($1, $2, 'CAPTURED', $3, $4)
             ON CONFLICT (vipps_charge_id) DO UPDATE SET status = 'CAPTURED'`,
            [subscriptionId, chargeId, amount, chargeType]
          );
          console.log(`Charge ${chargeId} (${chargeType}) was captured and saved to DB.`);
        } else {
          console.warn(`Received a charge for an unknown agreementId: ${agreementId}`);
        }
        break;
      
      // RETTELSE 2: Tilføj en default case for uventede events.
      default:
        console.warn(`Unhandled webhook eventType received: ${eventType}`);
        break;
    }
    
    return NextResponse.json({ status: 'received' });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}