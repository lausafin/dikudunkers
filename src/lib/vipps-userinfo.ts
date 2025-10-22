// src/lib/vipps-userinfo.ts
import { getVippsAccessToken } from './vipps';

export async function fetchAndSaveMemberData(agreementId: string, pool: any) {
  console.log(`Starting fulfillment for agreement: ${agreementId}`);
  const accessToken = await getVippsAccessToken();

  // 1. Hent aftalen for at få 'sub' (subject ID)
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

  // 4. Opdater det eksisterende PENDING abonnement til ACTIVE
  await pool.query(
    `UPDATE subscriptions 
     SET 
       status = 'ACTIVE', 
       member_id = $1, 
       last_charged_at = CURRENT_DATE,
       updated_at = CURRENT_TIMESTAMP
     WHERE vipps_agreement_id = $2`,
    [memberId, agreementId]
  );

  console.log(`Fulfillment successful for member ${memberId}, agreement ${agreementId}`);
}