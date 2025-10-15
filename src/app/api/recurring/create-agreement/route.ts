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

    // Basic validation
    if (!phoneNumber || !membershipType || !priceInOre || !productName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = 1; // Replace with real authenticated user ID

    // This logic correctly determines the base URL in any environment
    const getBaseUrl = () => {
      // Vercel provides this for preview and production deployments
      if (process.env.VERCEL_URL) return `https://` + process.env.VERCEL_URL;
      // Fallback for local development
      return process.env.BASE_URL || 'http://localhost:3000';
    };

    const baseUrl = getBaseUrl();

    const agreementPayload = {
      // Vipps API uses months for intervals. 6 months = semi-annually.
      interval: {
        unit: "MONTH",
        count: 6
      },
      // === NEW: ADD THE INITIAL CHARGE OBJECT ===
      initialCharge: {
         amount: priceInOre,
         description: `Første betaling for ${productName}`,
         transactionType: "DIRECT_CAPTURE" // Capture the payment immediately
      },
      // ==========================================
      pricing: {
        amount: priceInOre,
        currency: "DKK"
      },
      merchantRedirectUrl: `${baseUrl}/subscription-success`,
      merchantAgreementUrl: `${baseUrl}/my-account/subscription`,
      phoneNumber: phoneNumber,
      productName: productName
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
    
    // Save the specific membership type and price to your database
    await pool.query(
      'INSERT INTO subscriptions (user_id, vipps_agreement_id, status, membership_type, price_in_ore) VALUES ($1, $2, $3, $4, $5)',
      [userId, agreementId, 'PENDING', membershipType, priceInOre]
    );
    
    return NextResponse.json({ vippsConfirmationUrl: data.vippsConfirmationUrl, agreementId });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}