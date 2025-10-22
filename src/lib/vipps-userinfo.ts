// src/lib/vipps-userinfo.ts
import { getVippsAccessToken } from './vipps';
import { type Pool } from 'pg';

export async function fetchAndSaveMemberData(agreementId: string, pool: Pool) {
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
    throw new Error(`No 'sub' found in agreement ${agreementId}. Did the user consent to profile sharing?`);
  }

  // 2. Brug 'sub' til at hente personlige oplysninger fra Userinfo API
  const userInfoResponse = await fetch(`${process.env.VIPPS_API_BASE_URL}/vipps-userinfo-api/userinfo/${agreement.sub}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!userInfoResponse.ok) throw new Error(`Failed to fetch userinfo for sub ${agreement.sub}`);
  const userInfo = await userInfoResponse.json();

  // 3. Gem medlemmet i databasen (UPSERT - opret hvis ny, opdater hvis eksisterende)
  // Vi bruger vipps_sub som unik nøgle.
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
      userInfo.birthdate, // Bemærk: Vipps sender ofte birthdate som YYYY-MM-DD
      userInfo.address?.street_address,
      `${userInfo.address?.postal_code} ${userInfo.address?.region}`,
      userInfo.address?.country
    ]
  );
  const memberId = memberResult.rows[0].id;

  // 4. Opret abonnementet linket til medlemmet
  // Vi skal bruge membership_type og price fra et sted. 
  // I en simpel løsning kan vi udlede det fra aftalens productName eller pricing,
  // eller gemme det midlertidigt i en 'drafts' tabel.
  // For nu antager vi, at vi kan udlede det fra productName eller at vi gemmer det ved oprettelse.
  // En robust løsning: Gem membership_type i 'drafts' tabel ved oprettelse og slå op her.
  // SIMPEL LØSNING HER: Vi gætter baseret på pris fra Vipps-aftalen.
  
  let membershipType = 'Ukendt';
  if (agreement.pricing.amount === 15000) membershipType = 'Haladgang';
  if (agreement.pricing.amount === 35000) membershipType = 'Kamphold';

  await pool.query(
    `INSERT INTO subscriptions 
     (member_id, vipps_agreement_id, status, membership_type, price_in_ore, last_charged_at)
     VALUES ($1, $2, 'ACTIVE', $3, $4, CURRENT_DATE)
     ON CONFLICT (vipps_agreement_id) DO UPDATE SET status = 'ACTIVE'`,
    [memberId, agreementId, membershipType, agreement.pricing.amount]
  );

  console.log(`Fulfillment successful for member ${memberId}, agreement ${agreementId}`);
}