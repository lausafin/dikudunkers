// src/app/api/webhooks/vipps/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyVippsWebhook } from '@/lib/vipps-security';
import { fetchAndSaveMemberData } from '@/lib/vipps-userinfo';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    
    // HUSK AT FJERNE KOMMENTERING I PRODUKTION!
    const isVerified = await verifyVippsWebhook(rawBody, request.headers, request.nextUrl.pathname);
    if (!isVerified) {
      console.warn('Webhook verification failed!');
      return new Response('Unauthorized: Signature verification failed', { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const { eventType, agreementId } = payload;

    console.log(`Webhook received: ${eventType} for ${agreementId}`);

    if (eventType === 'recurring.agreement-activated.v1') {
      await fetchAndSaveMemberData(agreementId, pool);
    } 
    else if (eventType === 'recurring.agreement-stopped.v1') {
      await pool.query(
        "UPDATE subscriptions SET status = 'STOPPED', updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $1",
        [agreementId]
      );
    }
    else if (eventType === 'recurring.agreement-expired.v1') {
      await pool.query(
        "UPDATE subscriptions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $1",
        [agreementId]
      );
    }
    // Ignorer andre events for nu
    
    return NextResponse.json({ status: 'received' });

  } catch (error) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}