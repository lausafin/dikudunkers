// src/app/api/webhooks/vipps/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyVippsWebhook } from '@/lib/vipps-security';

export async function POST(request: NextRequest) { // Changed to NextRequest to get pathname
  try {
    // We need the raw body as a string for verification, so we read it once.
    const rawBody = await request.text();

    // The new verification function needs the body, headers, and the request path.
    const isVerified = await verifyVippsWebhook(rawBody, request.headers, request.nextUrl.pathname);

    if (!isVerified) {
      return new Response('Unauthorized: Signature verification failed', { status: 401 });
    }

    // Since verification passed, we can now safely parse the body we already read.
    const payload = JSON.parse(rawBody);
    const { eventType, agreementId, actor } = payload;

    let newStatus = '';

    console.log(`Webhook VERIFIED and received: ${eventType} for agreement ${agreementId}`);

    switch (eventType) {
      case 'recurring.agreement-activated.v1':
        newStatus = 'ACTIVE';
        break;
      case 'recurring.agreement-activated.v1':
        // An agreement is active, which means the initialCharge was successful.
        // We set the status and the first charge date.
        await pool.query(
          `UPDATE subscriptions 
           SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP, last_charged_at = current_date 
           WHERE vipps_agreement_id = $1`,
          [agreementId]
        );
        break;
      case 'recurring.agreement-stopped.v1':
        newStatus = 'STOPPED';
        console.log(`Agreement ${agreementId} was stopped by ${actor}.`);
        break;
      case 'recurring.agreement-expired.v1':
        newStatus = 'EXPIRED';
        break;
    }

    if (newStatus) {
      await pool.query(
        'UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $2',
        [newStatus, agreementId]
      );
    }
    
    return NextResponse.json({ status: 'received' });

  } catch (error) {
    console.error("Webhook processing error:", error);
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}