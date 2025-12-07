// src/app/api/webhooks/vipps/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyVippsWebhook } from '@/lib/vipps-security';
import { fetchAndSaveMemberData } from '@/lib/vipps-userinfo';
import getRedisClient from '@/lib/redis';
import { PoolClient } from 'pg';

// 1. Type Definitions for better safety
interface VippsWebhookPayload {
  eventType: string;
  agreementId: string;
  chargeId?: string;
  amount?: number;     // Amount in øre
  chargeType?: string; // e.g., "RECURRING" or "INITIAL"
  transactionId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    
    // 2. Security Verification
    const url = new URL(request.url);
    const pathAndQuery = url.pathname + url.search;
    
    const isVerified = await verifyVippsWebhook(rawBody, request.headers, pathAndQuery);
    if (!isVerified) {
      console.warn('Webhook verification failed: Invalid signature.');
      return new Response('Unauthorized', { status: 401 });
    }

    const payload: VippsWebhookPayload = JSON.parse(rawBody);
    const { eventType, agreementId } = payload;

    console.log(`[Webhook] Received ${eventType} | Agreement: ${agreementId}`);

    // 3. Event Routing
    switch (eventType) {
      case 'recurring.agreement-activated.v1':
        await handleAgreementActivated(agreementId);
        break;

      case 'recurring.agreement-stopped.v1':
        await handleAgreementStopped(agreementId);
        break;

      case 'recurring.agreement-expired.v1':
        await handleAgreementExpired(agreementId);
        break;

      case 'recurring.charge-captured.v1':
        await handleChargeCaptured(payload);
        break;

      case 'recurring.charge-failed.v1':
        await handleChargeFailed(payload);
        break;

      // Log these for completeness, even if we don't take action yet
      case 'recurring.charge-refunded.v1':
      case 'recurring.charge-canceled.v1':
        console.log(`[Webhook] Info: Charge event ${eventType} received. No action taken.`);
        break;

      default:
        console.warn(`[Webhook] Warning: Unhandled eventType: ${eventType}`);
        break;
    }

    return NextResponse.json({ status: 'received' });

  } catch (error) {
    console.error("[Webhook] Critical Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ==============================================================================
// Helper Functions (Keeps the main logic clean)
// ==============================================================================

async function handleAgreementActivated(agreementId: string) {
  // Use existing logic to fetch user info from Vipps and create member/subscription
  await fetchAndSaveMemberData(agreementId, pool);
  
  // Update Redis for the frontend polling
  const redis = await getRedisClient();
  await redis.set(`status:${agreementId}`, 'ACTIVE', { EX: 300 }); // 5 min cache
  console.log(`[Redis] Set status for ${agreementId} to ACTIVE.`);
}

async function handleAgreementStopped(agreementId: string) {
  await pool.query(
    "UPDATE subscriptions SET status = 'STOPPED', updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $1",
    [agreementId]
  );
  
  // Invalidate Redis cache immediately so user sees the stop
  const redis = await getRedisClient();
  await redis.del(`status:${agreementId}`);
  console.log(`[DB] Agreement ${agreementId} marked as STOPPED.`);
}

async function handleAgreementExpired(agreementId: string) {
  // Only expire pending agreements. Active agreements don't auto-expire via this webhook usually.
  const result = await pool.query(
    "UPDATE subscriptions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $1 AND status = 'PENDING'",
    [agreementId]
  );
  if (result.rowCount && result.rowCount > 0) {
    console.log(`[DB] Pending agreement ${agreementId} expired.`);
  }
}

async function handleChargeCaptured(payload: VippsWebhookPayload) {
  const { agreementId, chargeId, amount, chargeType } = payload;
  if (!chargeId || amount === undefined) return;

  // Helper to upsert charge
  const saveCharge = async (subId: number) => {
    await pool.query(
      `INSERT INTO charges (subscription_id, vipps_charge_id, status, amount_in_ore, charge_type)
       VALUES ($1, $2, 'CAPTURED', $3, $4)
       ON CONFLICT (vipps_charge_id) DO UPDATE SET status = 'CAPTURED', updated_at = CURRENT_TIMESTAMP`,
      [subId, chargeId, amount, chargeType]
    );
  };

  // 1. Try to find subscription
  const subResult = await pool.query(
    'SELECT id FROM subscriptions WHERE vipps_agreement_id = $1',
    [agreementId]
  );

  if (subResult.rows.length > 0) {
    // Happy Path
    await saveCharge(subResult.rows[0].id);
    console.log(`[DB] Charge ${chargeId} captured for existing subscription.`);
  } else {
    // Race Condition Path
    console.warn(`[Race Condition] Charge ${chargeId} arrived before agreement ${agreementId}. Triggering fulfillment...`);
    
    try {
      // Force creation of member/subscription
      await fetchAndSaveMemberData(agreementId, pool);
      
      // Try finding it again
      const retryResult = await pool.query(
        'SELECT id FROM subscriptions WHERE vipps_agreement_id = $1',
        [agreementId]
      );
      
      if (retryResult.rows.length > 0) {
        await saveCharge(retryResult.rows[0].id);
        console.log(`[DB] Charge ${chargeId} captured after forced fulfillment.`);
      } else {
        throw new Error(`Subscription still missing after fulfillment for ${agreementId}`);
      }
    } catch (err) {
      console.error(`[Critical] Failed to resolve race condition for ${agreementId}:`, err);
      // We do NOT throw here, so we return 200 OK to Vipps. 
      // Retrying 500s won't fix a logic error, better to log and alert admin.
    }
  }
}

async function handleChargeFailed(payload: VippsWebhookPayload) {
  const { agreementId, chargeId, amount, chargeType } = payload;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Suspend the subscription
    const subResult = await client.query(
      "UPDATE subscriptions SET status = 'SUSPENDED', updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $1 RETURNING id",
      [agreementId]
    );

    const subscriptionId = subResult.rows[0]?.id;

    if (subscriptionId) {
      // 2. Log the failed charge
      await client.query(
        `INSERT INTO charges (subscription_id, vipps_charge_id, status, amount_in_ore, charge_type)
         VALUES ($1, $2, 'FAILED', $3, $4)
         ON CONFLICT (vipps_charge_id) DO UPDATE SET status = 'FAILED', updated_at = CURRENT_TIMESTAMP`,
        [subscriptionId, chargeId || 'unknown', amount || 0, chargeType]
      );
      console.warn(`[DB] Agreement ${agreementId} suspended due to failed charge ${chargeId}.`);
    } else {
      console.error(`[DB] Could not find subscription ${agreementId} to suspend.`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[DB] Transaction failed processing charge failure for ${agreementId}`, error);
    throw error;
  } finally {
    client.release();
  }
}