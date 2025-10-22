// src/app/api/webhooks/vipps/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyVippsWebhook } from '@/lib/vipps-security';
import { fetchAndSaveMemberData } from '@/lib/vipps-userinfo'; // Importer funktionen ovenfor

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    // HUSK AT SLÅ VERIFIKATION TIL I PRODUKTION!
    // const isVerified = await verifyVippsWebhook(rawBody, request.headers, request.nextUrl.pathname);
    // if (!isVerified) return new Response('Unauthorized', { status: 401 });

    const payload = JSON.parse(rawBody);
    const { eventType, agreementId } = payload;

    console.log(`Webhook received: ${eventType} for ${agreementId}`);

    if (eventType === 'recurring.agreement-activated.v1') {
      // Dette er det kritiske punkt: Aftalen er aktiv, hent data!
      // Vi bruger 'waitUntil' (hvis Vercel understøtter det i din plan) eller bare await,
      // for at sikre at vi færdiggør arbejdet før vi svarer Vipps.
      await fetchAndSaveMemberData(agreementId, pool);
    } 
    else if (eventType === 'recurring.agreement-stopped.v1' || eventType === 'recurring.agreement-expired.v1') {
      const status = eventType === 'recurring.agreement-stopped.v1' ? 'STOPPED' : 'EXPIRED';
      await pool.query(
        "UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $2",
        [status, agreementId]
      );
    }

    return NextResponse.json({ status: 'received' });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}