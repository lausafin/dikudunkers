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

      // ==========================================================
      // == NEW, ROBUST LOGIC FOR HANDLING CHARGE CAPTURE ==
      // ==========================================================
      case 'recurring.charge-captured.v1':
        // Step 1: Try to find the subscription.
        const subResult = await pool.query(
          'SELECT id FROM subscriptions WHERE vipps_agreement_id = $1',
          [agreementId]
        );
        
        if (subResult.rows.length > 0) {
          // HAPPY PATH: Agreement webhook arrived first. Just save the charge.
          const subscriptionId = subResult.rows[0].id;
          await pool.query(
            `INSERT INTO charges (subscription_id, vipps_charge_id, status, amount_in_ore, charge_type)
             VALUES ($1, $2, 'CAPTURED', $3, $4)
             ON CONFLICT (vipps_charge_id) DO UPDATE SET status = 'CAPTURED'`,
            [subscriptionId, chargeId, amount, chargeType]
          );
          console.log(`Charge ${chargeId} (${chargeType}) was captured and saved to DB.`);
        } else {
          // RACE CONDITION PATH: Charge arrived first.
          console.warn(`Race condition: Charge arrived before agreement for ${agreementId}. Triggering fulfillment...`);
          
          // Step 2: Run the fulfillment logic ourselves. This will create the member and subscription.
          await fetchAndSaveMemberData(agreementId, pool);

          // Step 3: Try to find the subscription AGAIN. It should exist now.
          const secondSubResult = await pool.query('SELECT id FROM subscriptions WHERE vipps_agreement_id = $1', [agreementId]);
          if (secondSubResult.rows.length > 0) {
            const newSubscriptionId = secondSubResult.rows[0].id;
            // Now that the subscription exists, save the charge record.
            await pool.query(
              `INSERT INTO charges (subscription_id, vipps_charge_id, status, amount_in_ore, charge_type)
               VALUES ($1, $2, 'CAPTURED', $3, $4) ON CONFLICT (vipps_charge_id) DO UPDATE SET status = 'CAPTURED'`,
              [newSubscriptionId, chargeId, amount, chargeType]
            );
            console.log(`Charge ${chargeId} was captured and saved to DB after fulfillment.`);
          } else {
            // If it still fails, something is seriously wrong with the fulfillment logic.
            console.error(`CRITICAL: Fulfillment failed for agreementId: ${agreementId}. Could not save charge record.`);
          }
        }
        break;
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