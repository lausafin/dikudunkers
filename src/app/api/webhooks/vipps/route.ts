// src/app/api/webhooks/vipps/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyVippsWebhook } from '@/lib/vipps-security';
import { fetchAndSaveMemberData } from '@/lib/vipps-userinfo';
import { kv } from '@vercel/kv';

export async function POST(request: NextRequest) {
  // INTENTIONALLY THROW AN ERROR TO SIMULATE A FAILURE
  // throw new Error("SIMULATED WEBHOOK FAILURE FOR TESTING!");

  try {
    const rawBody = await request.text();
    // === MODIFICATION HERE ===
    // Reconstruct the path and query from the full URL to be safe.
    const url = new URL(request.url);
    const pathAndQuery = url.pathname + url.search;
    // =========================
    const isVerified = await verifyVippsWebhook(rawBody, request.headers, pathAndQuery);
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
        // 1. Perform the durable database operations as before.
        await fetchAndSaveMemberData(agreementId, pool);

        // ==========================================================
        // == THE NEW HIGH-SPEED NOTIFICATION STEP ==
        // ==========================================================
        // 2. After the database is updated, set a flag in the fast KV store.
        //    This flag tells the poller "The work is done!".
        //    We set an expiration of 5 minutes (300 seconds) to auto-clean the flag.
        await kv.set(`status:${agreementId}`, 'ACTIVE', { ex: 300 });
        console.log(`[KV NOTIFICATION] Set status flag for ${agreementId} to ACTIVE.`);
        // ==========================================================
        break;
      
      // --- CORRECT LOGIC FOR 'expired' (your original logic was perfect for this) ---
      case 'recurring.agreement-expired.v1':
        console.log(`Agreement ${agreementId} expired. Marking as EXPIRED in DB.`);
        await pool.query(
          // This query ONLY affects abandoned PENDING agreements.
          "UPDATE subscriptions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $1 AND status = 'PENDING'",
          [agreementId]
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