// src/app/api/webhooks/vipps/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyVippsWebhook } from '@/lib/vipps-security'; // We use our updated helper

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    
    // Get the signature from the correct header
    const signature = request.headers.get('Vipps-Webhook-Signature');

    // Verify the signature. If it fails, reject the request.
    if (!await verifyVippsWebhook(signature, rawBody)) {
      console.warn('Webhook verification failed.');
      return new Response('Unauthorized: Signature verification failed', { status: 401 });
    }

    // If verification is successful, parse the JSON body and process the event
    const payload = JSON.parse(rawBody);
    console.log("Verified webhook received:", payload);

    const { eventType, agreementId, actor, chargeId } = payload;
    let newStatus = '';

    switch (eventType) {
      case 'recurring.agreement-activated.v1':
        newStatus = 'ACTIVE';
        console.log(`Webhook: Agreement ${agreementId} activated.`);
        break;
      case 'recurring.agreement-stopped.v1':
        newStatus = 'STOPPED';
        console.log(`Webhook: Agreement ${agreementId} was stopped by ${actor}.`);
        break;
      case 'recurring.agreement-expired.v1':
        newStatus = 'EXPIRED';
        console.log(`Webhook: Agreement ${agreementId} expired.`);
        break;
      
      case 'recurring.charge-failed.v1':
        console.error(`Webhook: Charge ${chargeId} for agreement ${agreementId} FAILED.`);
        break;
    }

    if (newStatus && agreementId) {
      const result = await pool.query(
        'UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $2',
        [newStatus, agreementId]
      );
      if (result.rowCount > 0) {
        console.log(`Database updated for agreement ${agreementId}. New status: ${newStatus}`);
      } else {
        console.warn(`No subscription found in DB with vipps_agreement_id: ${agreementId}`);
      }
    }
    
    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch (error) {
      console.error("Webhook processing error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Webhook processing failed';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}