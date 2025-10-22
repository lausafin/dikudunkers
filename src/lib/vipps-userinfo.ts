// src/lib/vipps-userinfo.ts
import { Pool } from 'pg';
import { getVippsAccessToken } from './vipps';

export async function fetchAndSaveMemberData(agreementId: string, pool: Pool) {
  console.log(`Starting fulfillment for agreement: ${agreementId}`);
  const accessToken = await getVippsAccessToken();

  // 1. Hent aftalen for at få 'sub' (subject ID) og pris
  const agrResponse = await fetch(`${process.env.VIPPS_API_BASE_URL}/recurring/v3/agreements/${agreementId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
      'Merchant-Serial-Number': process.env.VIPPS_MSN!,
    },
  });
  
  if (!agrResponse.ok) throw new Error(`Failed to fetch agreement ${agreementId}`);
  const agreement = await agrResponse.json();
  
  if (!agreement.sub) {
    throw new Error(`No 'sub' found in agreement ${agreementId}. User might not have consented to profile sharing.`);
  }

  // 2. Brug 'sub' til at hente personlige oplysninger
  const userInfoResponse = await fetch(`${process.env.VIPPS_API_BASE_URL}/vipps-userinfo-api/userinfo/${agreement.sub}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!userInfoResponse.ok) throw new Error(`Failed to fetch userinfo for sub ${agreement.sub}`);
  const userInfo = await userInfoResponse.json();

  // 3. Opret/opdater medlem i databasen
  const memberResult = await pool.query(
    `INSERT INTO members (vipps_sub, name, email, phone_number, birth_date, address_line1, address_line2, country)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (vipps_sub) DO UPDATE 
     SET name = EXCLUDED.name, email = EXCLUDED.email, updated_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [
      agreement.sub,
      userInfo.name,
      userInfo.email,
      userInfo.phone_number,
      userInfo.birthdate,
      userInfo.address?.street_address,
      `${userInfo.address?.postal_code || ''} ${userInfo.address?.region || ''}`.trim(),
      userInfo.address?.country
    ]
  );
  const memberId = memberResult.rows[0].id;

  // 4. BESTEM MEDLEMSTYPE BASERET PÅ PRISEN I AFTALEN
  let membershipType = 'Ukendt';
  const priceInOre = agreement.pricing.amount;
  if (priceInOre === 15000) membershipType = 'Haladgang';
  if (priceInOre === 35000) membershipType = 'Kamphold';

  // 5. OPRET ABONNEMENTET I DATABASEN (RETTELSEN ER HER)
  // FØR: Var en UPDATE-kommando, der ikke gjorde noget, fordi rækken ikke eksisterede.
  // NU: Er en INSERT-kommando, der opretter den manglende række.
  await pool.query(
    `INSERT INTO subscriptions 
     (member_id, vipps_agreement_id, status, membership_type, price_in_ore, last_charged_at)
     VALUES ($1, $2, 'ACTIVE', $3, $4, CURRENT_DATE)
     ON CONFLICT (vipps_agreement_id) DO UPDATE SET 
       status = 'ACTIVE', 
       member_id = EXCLUDED.member_id,
       updated_at = CURRENT_TIMESTAMP`,
    [memberId, agreementId, membershipType, priceInOre]
  );

  console.log(`Fulfillment successful for member ${memberId}, agreement ${agreementId}`);
}