// src/app/api/recurring/create-agreement/route.ts
import { NextResponse } from 'next/server';
import { getVippsAccessToken } from '@/lib/vipps';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const accessToken = await getVippsAccessToken();
    const { 
      // phoneNumber er fjernet herfra
      membershipType, 
      priceInOre, 
      productName 
    } = await request.json();

    // Opdateret validering
    if (!membershipType || !priceInOre || !productName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const getBaseUrl = () => {
      if (process.env.VERCEL_URL) return `https://` + process.env.VERCEL_URL;
      return process.env.BASE_URL || 'http://localhost:3000';
    };
    const baseUrl = getBaseUrl();

    // ==========================================================
    // == THE CRITICAL CHANGE IS HERE ==
    // ==========================================================
    // We create a temporary, unique ID to pass to Vipps.
    // We will use this ID to look up the real agreementId later.
    const tempRedirectId = uuidv4();
    // ==========================================================

    const agreementPayload = {
      interval: { unit: "MONTH", count: 6 },
      initialCharge: {
         amount: priceInOre,
         description: `Første betaling for ${productName}`,
         transactionType: "DIRECT_CAPTURE"
      },
      pricing: { amount: priceInOre, currency: "DKK" },
      merchantRedirectUrl: `${baseUrl}/subscription-success?temp_id=${tempRedirectId}`,
      merchantAgreementUrl: `${baseUrl}/my-account/subscription`,
      // phoneNumber-feltet er nu helt fjernet fra payloaden til Vipps
      productName: productName,
      scope: "name email phoneNumber address birthDate"
    };

    const response = await fetch(`${process.env.VIPPS_API_BASE_URL}/recurring/v3/agreements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
        'Merchant-Serial-Number': process.env.VIPPS_MSN!,
        'Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(agreementPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Vipps API Error:", errorBody);
      throw new Error(`Failed to create agreement. Status: ${response.status}`);
    }

    const data = await response.json();
    const { agreementId } = data;
    
    // Now, we link the temporary ID to the real agreementId in our database
    await pool.query(
      `INSERT INTO subscriptions (vipps_agreement_id, status, membership_type, price_in_ore, temp_redirect_id)
       VALUES ($1, 'PENDING', $2, $3, $4)
       ON CONFLICT (vipps_agreement_id) DO UPDATE SET temp_redirect_id = EXCLUDED.temp_redirect_id`,
      [agreementId, membershipType, priceInOre, tempRedirectId]
    );

    console.log(`[DIAGNOSTIC] Inserted PENDING record for agreementId: ${agreementId}`);
    // =====================================
    
    return NextResponse.json({ vippsConfirmationUrl: data.vippsConfirmationUrl, agreementId: data.agreementId });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}