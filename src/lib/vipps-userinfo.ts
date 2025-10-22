// src/lib/vipps-userinfo.ts
import { Pool } from 'pg';
import { getVippsAccessToken } from './vipps';

export async function fetchAndSaveMemberData(agreementId: string, pool: Pool) {
  console.log(`[DIAGNOSTIC] Starting fulfillment for agreement: ${agreementId}`);
  
  const client = await pool.connect();
  console.log('[DIAGNOSTIC] Database client connected.');

  try {
    await client.query('BEGIN');
    console.log('[DIAGNOSTIC] Transaction started.');

    console.log('[DIAGNOSTIC] 1. Fetching access token...');
    const accessToken = await getVippsAccessToken();
    console.log('[DIAGNOSTIC]    ... Access token fetched.');

    console.log(`[DIAGNOSTIC] 2. Fetching Vipps agreement ${agreementId}...`);
    const agrResponse = await fetch(`${process.env.VIPPS_API_BASE_URL}/recurring/v3/agreements/${agreementId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
        'Merchant-Serial-Number': process.env.VIPPS_MSN!,
      },
    });
    console.log(`[DIAGNOSTIC]    ... Agreement fetch response status: ${agrResponse.status}`);
    if (!agrResponse.ok) throw new Error(`Failed to fetch agreement. Status: ${agrResponse.status}`);
    const agreement = await agrResponse.json();
    if (!agreement.sub) throw new Error(`No 'sub' found in agreement.`);

    console.log(`[DIAGNOSTIC] 3. Fetching user info for sub: ${agreement.sub}...`);
    const userInfoResponse = await fetch(`${process.env.VIPPS_API_BASE_URL}/vipps-userinfo-api/userinfo/${agreement.sub}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    console.log(`[DIAGNOSTIC]    ... User info fetch response status: ${userInfoResponse.status}`);
    if (!userInfoResponse.ok) throw new Error(`Failed to fetch userinfo. Status: ${userInfoResponse.status}`);
    const userInfo = await userInfoResponse.json();

    console.log(`[DIAGNOSTIC] 4. Upserting into 'members' table with vipps_sub: ${agreement.sub}...`);
    const memberResult = await client.query(
      `INSERT INTO members (vipps_sub, name, email, phone_number, birth_date, address_line1, address_line2, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (vipps_sub) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [
        agreement.sub, userInfo.name, userInfo.email, userInfo.phone_number, userInfo.birthdate,
        userInfo.address?.street_address, `${userInfo.address?.postal_code || ''} ${userInfo.address?.region || ''}`.trim(), userInfo.address?.country
      ]
    );
    const memberId = memberResult.rows[0]?.id;
    if (!memberId) throw new Error("Failed to get memberId after upsert.");
    console.log(`[DIAGNOSTIC]    ... Member upserted successfully. memberId: ${memberId}`);

    let membershipType = 'Ukendt';
    const priceInOre = agreement.pricing.amount;
    if (priceInOre === 15000) membershipType = 'Haladgang';
    if (priceInOre === 35000) membershipType = 'Kamphold';
    console.log(`[DIAGNOSTIC] 5. Determined membership type: ${membershipType} for price: ${priceInOre}`);
    
    console.log(`[DIAGNOSTIC] 6. Inserting into 'subscriptions' with memberId: ${memberId} and agreementId: ${agreementId}...`);
    await client.query(
      `INSERT INTO subscriptions (member_id, vipps_agreement_id, status, membership_type, price_in_ore, last_charged_at)
       VALUES ($1, $2, 'ACTIVE', $3, $4, CURRENT_DATE)
       ON CONFLICT (vipps_agreement_id) DO UPDATE SET status = 'ACTIVE', member_id = EXCLUDED.member_id, updated_at = CURRENT_TIMESTAMP`,
      [memberId, agreementId, membershipType, priceInOre]
    );
    console.log('[DIAGNOSTIC]    ... Subscription inserted successfully.');

    await client.query('COMMIT');
    console.log(`[SUCCESS] Transaction committed for agreement ${agreementId}.`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[CRITICAL ERROR] Transaction rolled back for agreement ${agreementId}.`, error);
    throw error;
  } finally {
    client.release();
    console.log('[DIAGNOSTIC] Database client released.');
  }
}