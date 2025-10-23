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
      console.warn('Webhook verification failed!');
      return new Response('Unauthorized: Signature verification failed', { status: 401 });
    }
    
    const payload = JSON.parse(rawBody);
    const { eventType, agreementId, chargeId, chargeType, amount } = payload;

    console.log(`Webhook received: ${eventType} for agreement ${agreementId}, charge ${chargeId}`);

    // Get the subscription ID from our database based on the Vipps agreementId
    // This is a common operation for multiple event types.
    const getSubscriptionId = async (vippsAgreementId: string): Promise<number | null> => {
        const subResult = await pool.query(
          'SELECT id FROM subscriptions WHERE vipps_agreement_id = $1',
          [vippsAgreementId]
        );
        return subResult.rows[0]?.id || null;
    };

    switch (eventType) {
      case 'recurring.agreement-activated.v1':
        await fetchAndSaveMemberData(agreementId, pool);
        break;

      case 'recurring.agreement-stopped.v1':
      case 'recurring.agreement-expired.v1':
        const status = eventType === 'recurring.agreement-stopped.v1' ? 'STOPPED' : 'EXPIRED';
        await pool.query(
          "UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $2",
          [status, agreementId]
        );
        break;

      case 'recurring.charge-captured.v1':
        const subscriptionIdForCapture = await getSubscriptionId(agreementId);
        if (subscriptionIdForCapture) {
          await pool.query(
            `INSERT INTO charges (subscription_id, vipps_charge_id, status, amount_in_ore, charge_type)
             VALUES ($1, $2, 'CAPTURED', $3, $4)
             ON CONFLICT (vipps_charge_id) DO UPDATE SET status = 'CAPTURED'`,
            [subscriptionIdForCapture, chargeId, amount, chargeType]
          );
        } else {
          console.error(`CRITICAL: Could not find subscription for agreementId: ${agreementId} during charge capture.`);
          // Optionally, you could try to fulfill the agreement here as a fallback,
          // but it indicates a potential race condition or logic issue.
        }
        break;

      // ==========================================================
      // == NEW CASE: HANDLE FAILED CHARGES ==
      // ==========================================================
      case 'recurring.charge-failed.v1':
        console.warn(`Payment failed for agreement ${agreementId}, charge ${chargeId}. Suspending subscription.`);
        
        // Step A: Update the subscription status to 'SUSPENDED'
        await pool.query(
          "UPDATE subscriptions SET status = 'SUSPENDED', updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $1",
          [agreementId]
        );
        
        // Step B: Record the failed charge for auditing purposes
        const subscriptionIdForFailure = await getSubscriptionId(agreementId);
        if (subscriptionIdForFailure) {
          await pool.query(
            `INSERT INTO charges (subscription_id, vipps_charge_id, status, amount_in_ore, charge_type)
             VALUES ($1, $2, 'FAILED', $3, $4)
             ON CONFLICT (vipps_charge_id) DO UPDATE SET status = 'FAILED'`,
            [subscriptionIdForFailure, chargeId, amount, chargeType]
          );
        } else {
          console.error(`CRITICAL: Could not find subscription for agreementId: ${agreementId} during charge failure processing.`);
        }
        break;
      // ==========================================================
      
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