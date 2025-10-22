// src/app/api/recurring/create-agreement/route.ts
import { NextResponse } from 'next/server';
import { getVippsAccessToken } from '@/lib/vipps';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const accessToken = await getVippsAccessToken();
    const { 
      phoneNumber, 
      membershipType, 
      priceInOre, 
      productName 
    } = await request.json();

    if (!phoneNumber || !membershipType || !priceInOre || !productName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = 1; // Erstat med rigtig bruger-ID fra authentication

    const getBaseUrl = () => {
      if (process.env.VERCEL_URL) return `https://` + process.env.VERCEL_URL;
      return process.env.BASE_URL || 'http://localhost:3000';
    };
    const baseUrl = getBaseUrl();

    const agreementPayload = {
      interval: { unit: "MONTH", count: 6 },
      initialCharge: {
         amount: priceInOre,
         description: `Første betaling for ${productName}`,
         transactionType: "DIRECT_CAPTURE"
      },
      pricing: { amount: priceInOre, currency: "DKK" },
      merchantRedirectUrl: `${baseUrl}/subscription-success`,
      merchantAgreementUrl: `${baseUrl}/my-account/subscription`,
      phoneNumber: phoneNumber,
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
    
    // Opret abonnementet i databasen med 'PENDING' status med det samme.
    // Dette sikrer, at vores polling-endpoint kan finde aftalen med det samme.
    await pool.query(
      `INSERT INTO subscriptions (user_id, vipps_agreement_id, status, membership_type, price_in_ore)
       VALUES ($1, $2, 'PENDING', $3, $4)
       ON CONFLICT (vipps_agreement_id) DO NOTHING`,
      [userId, agreementId, membershipType, priceInOre]
    );
    
    return NextResponse.json({ vippsConfirmationUrl: data.vippsConfirmationUrl, agreementId });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}