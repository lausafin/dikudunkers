// app/api/recurring/create-agreement/route.ts

import { NextResponse } from 'next/server';
import { getVippsAccessToken } from '@/lib/vipps'; // Vores hjælpefunktion
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db'; // Import the db connection pool

export async function POST(request: Request) {
  try {
    const accessToken = await getVippsAccessToken();
    const { phoneNumber } = await request.json(); // Vi får tlf. nummer fra frontend
    const userId = 1; // I en rigtig app skal du hente den loggede brugers ID

    const agreementPayload = {
      interval: {
        unit: "MONTH",
        count: 1
      },
      pricing: {
        amount: 29900, // 299 DKK i øre
        currency: "DKK" // Eller NOK
      },
      // VIGTIGT: Disse URL'er skal pege på din *live* hjemmeside
      merchantRedirectUrl: "https://dikudunkers.dk/subscription-success",
      merchantAgreementUrl: "https://dikudunkers.dk/my-account/subscription",
      phoneNumber: phoneNumber, // Test-brugerens telefonnummer
      productName: "Mit Fantastiske Månedsabonnement"
    };

    const response = await fetch(`${process.env.VIPPS_API_BASE_URL}/recurring/v3/agreements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
        'Merchant-Serial-Number': process.env.VIPPS_MSN!,
        'Idempotency-Key': uuidv4(), // Unikt ID for at undgå dobbelt-oprettelse
        // 'Vipps-System-Name': 'MinNextJsWebshop' // God praksis at inkludere
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
    
    // Save to your database
    await pool.query(
      'INSERT INTO subscriptions (user_id, vipps_agreement_id, status) VALUES ($1, $2, $3)',
      [userId, agreementId, 'PENDING']
    );
    
    // Send vippsConfirmationUrl tilbage til frontend
    return NextResponse.json({ vippsConfirmationUrl: data.vippsConfirmationUrl, agreementId: data.agreementId });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}