// src/lib/vipps-userinfo.ts
import { Pool } from 'pg';
import { getVippsAccessToken } from './vipps';

export async function fetchAndSaveMemberData(agreementId: string, pool: Pool) {
  console.log(`Starting fulfillment transaction for agreement: ${agreementId}`);
  
  // Start en klient-forbindelse fra poolen. Alle handlinger skal nu ske på 'client'.
  const client = await pool.connect();

  try {
    // Start en database-transaktion
    await client.query('BEGIN');

    const accessToken = await getVippsAccessToken();

    // Trin 1: Hent aftalen for at få 'sub' (bruger-ID) og pris
    const agrResponse = await fetch(`${process.env.VIPPS_API_BASE_URL}/recurring/v3/agreements/${agreementId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
        'Merchant-Serial-Number': process.env.VIPPS_MSN!,
      },
    });
    
    if (!agrResponse.ok) {
      throw new Error(`Failed to fetch agreement ${agreementId}. Status: ${agrResponse.status}`);
    }
    const agreement = await agrResponse.json();
    
    if (!agreement.sub) {
      throw new Error(`No 'sub' found in agreement ${agreementId}. User might not have consented to profile sharing.`);
    }

    // Trin 2: Brug 'sub' til at hente personlige oplysninger
    const userInfoResponse = await fetch(`${process.env.VIPPS_API_BASE_URL}/vipps-userinfo-api/userinfo/${agreement.sub}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      throw new Error(`Failed to fetch userinfo for sub ${agreement.sub}. Status: ${userInfoResponse.status}`);
    }
    const userInfo = await userInfoResponse.json();

    // Trin 3: Opret/opdater medlem i databasen ved hjælp af 'client'
    const memberResult = await client.query(
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
        userInfo.birthdate, // f.eks. '1990-01-01'
        userInfo.address?.street_address,
        `${userInfo.address?.postal_code || ''} ${userInfo.address?.region || ''}`.trim(),
        userInfo.address?.country
      ]
    );
    const memberId = memberResult.rows[0].id;

    // Trin 4: Bestem medlemstype ud fra prisen i aftalen
    let membershipType = 'Ukendt';
    const priceInOre = agreement.pricing.amount;
    if (priceInOre === 15000) membershipType = 'Haladgang';
    if (priceInOre === 35000) membershipType = 'Kamphold';

    // Trin 5: Opret abonnementet i databasen ved hjælp af 'client'
    await client.query(
      `INSERT INTO subscriptions 
       (member_id, vipps_agreement_id, status, membership_type, price_in_ore, last_charged_at)
       VALUES ($1, $2, 'ACTIVE', $3, $4, CURRENT_DATE)
       ON CONFLICT (vipps_agreement_id) DO UPDATE SET 
         status = 'ACTIVE', 
         member_id = EXCLUDED.member_id,
         updated_at = CURRENT_TIMESTAMP`,
      [memberId, agreementId, membershipType, priceInOre]
    );

    // Hvis alt ovenstående gik godt, gemmes ændringerne permanent i databasen.
    await client.query('COMMIT');
    console.log(`Transaction committed. Fulfillment successful for member ${memberId}, agreement ${agreementId}`);

  } catch (error) {
    // Hvis en af handlingerne fejlede, annulleres ALLE ændringer i denne transaktion.
    await client.query('ROLLBACK');
    console.error(`Transaction rolled back due to error for agreement ${agreementId}:`, error);
    // Vi kaster fejlen videre, så den bliver logget i Vercel.
    throw error;
  } finally {
    // Uanset om det lykkedes eller ej, skal vi frigive forbindelsen tilbage til poolen.
    client.release();
  }
}