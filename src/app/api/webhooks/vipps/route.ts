// src/app/api/webhooks/vipps/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyVippsWebhook } from '@/lib/vipps-security'; // Assuming this is your verification function

export async function POST(request: Request) {
  try {
    // 1. Get the signature header and the raw body text
    const signature = request.headers.get('X-Vipps-Signature'); // Or whatever the correct header name is
    const rawBody = await request.text();

    // 2. === FIX IS HERE ===
    // If the signature is missing, it's an unauthorized request. Reject it.
    if (!signature) {
      console.warn('Webhook received without a signature.');
      return new Response('Unauthorized: Missing signature header', { status: 401 });
    }

    // 3. Verify the signature. Now TypeScript knows `signature` is a string.
    if (!await verifyVippsWebhook(signature, rawBody)) {
      console.warn('Webhook verification failed.');
      return new Response('Unauthorized: Signature verification failed', { status: 401 });
    }

    // If verification passes, we can safely parse the body and process it
    const payload = JSON.parse(rawBody);
    const { eventType, agreementId, actor } = payload;
    let newStatus = '';

    switch (eventType) {
      case 'recurring.agreement-activated.v1':
        newStatus = 'ACTIVE';
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
    
    return NextResponse.json({ status: 'received' }, { status: 200 });

  } catch (error) {
      console.error("Webhook processing error:", error);
      const message = error instanceof Error ? error.message : 'Webhook processing failed';
      return NextResponse.json({ error: message }, { status: 500 });
  }
}