// src/app/api/recurring/get-status-by-temp-id/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import getRedisClient from '@/lib/redis';
import { getVippsAccessToken } from '@/lib/vipps'; // <--- Need this to ask Vipps
import { fetchAndSaveMemberData } from '@/lib/vipps-userinfo'; // <--- To sync data if active

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tempId = searchParams.get('temp_id');

  if (!tempId) {
    return NextResponse.json({ error: 'temp_id is required' }, { status: 400 });
  }

  try {
    // 1. LOCAL DB LOOKUP
    const subIdResult = await pool.query(
      'SELECT vipps_agreement_id FROM subscriptions WHERE temp_redirect_id = $1',
      [tempId]
    );
    const agreementId = subIdResult.rows[0]?.vipps_agreement_id;

    if (!agreementId) return NextResponse.json({ status: 'PENDING' });

    // 2. REDIS CHECK (Fastest)
    try {
      const redis = await getRedisClient();
      const redisStatus = await redis.get(`status:${agreementId}`);
      if (redisStatus === 'ACTIVE') {
        return NextResponse.json({ status: 'ACTIVE' });
      }
    } catch (_e) { /* Ignore Redis errors */ }

    // 3. DB STATUS CHECK
    const dbResult = await pool.query(
      'SELECT status FROM subscriptions WHERE vipps_agreement_id = $1',
      [agreementId]
    );
    let currentStatus = dbResult.rows[0]?.status || 'PENDING';

    // =====================================================================
    // 4. THE LIVE CHECK (If local DB is stale, ask Vipps directly)
    // =====================================================================
    if (currentStatus === 'PENDING') {
      try {
        console.log(`[Live Poll] Checking Vipps API for ${agreementId}...`);
        const accessToken = await getVippsAccessToken();
        
        const vippsResponse = await fetch(`${process.env.VIPPS_API_BASE_URL}/recurring/v3/agreements/${agreementId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
            'Merchant-Serial-Number': process.env.VIPPS_MSN!,
          },
        });

        if (vippsResponse.ok) {
          const vippsData = await vippsResponse.json();
          const liveStatus = vippsData.status; // 'ACTIVE', 'STOPPED', 'EXPIRED', 'PENDING'

          // If Vipps has a newer status than us, UPDATE our database immediately.
          if (liveStatus !== 'PENDING') {
            console.log(`[Live Poll] Status changed to ${liveStatus}. Syncing DB...`);
            
            if (liveStatus === 'ACTIVE') {
               // Run the full member creation logic if it became active
               await fetchAndSaveMemberData(agreementId, pool);
               
               // Update Redis to save future API calls
               try {
                 const redis = await getRedisClient();
                 await redis.set(`status:${agreementId}`, 'ACTIVE', { EX: 300 });
               } catch (_e) {}
            } else {
               // For STOPPED (Cancelled) or EXPIRED
               await pool.query(
                 "UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE vipps_agreement_id = $2",
                 [liveStatus, agreementId]
               );
            }
            
            // Update the variable so we return the correct status to frontend
            currentStatus = liveStatus;
          }
        }
      } catch (vippsError) {
        console.error("Failed to live-poll Vipps:", vippsError);
        // We suppress the error and just return PENDING so the user keeps polling
      }
    }
    // =====================================================================

    return NextResponse.json({ status: currentStatus });

  } catch (error) {
    console.error("Error in get-status-by-temp-id:", error);
    return NextResponse.json({ status: 'PENDING' });
  }
}