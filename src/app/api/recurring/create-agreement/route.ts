// src/app/api/recurring/create-agreement/route.ts
import { NextResponse } from 'next/server';
import { getVippsAccessToken } from '@/lib/vipps';
import { v4 as uuidv4 } from 'uuid';
// Vi har ikke længere brug for 'pool' her.

export async function POST(request: Request) {
  try { 
    const accessToken = await getVippsAccessToken();
    // 1. Fjern 'scope' fra destructuring
    const { 
      phoneNumber, 
      membershipType, 
      priceInOre, 
      productName
    } = await request.json();

    if (!phoneNumber || !membershipType || !priceInOre || !productName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const getBaseUrl = () => {
      if (process.env.VERCEL_URL) return `https://` + process.env.VERCEL_URL;
      return process.env.BASE_URL || 'http://localhost:3000';
    };

    const baseUrl = getBaseUrl();

    const agreementPayload = {
      interval: {
        unit: "MONTH",
        count: 6
      },
      initialCharge: {
         amount: priceInOre,
         description: `Første betaling for ${productName}`,
         transactionType: "DIRECT_CAPTURE"
      },
      pricing: {
        amount: priceInOre,
        currency: "DKK"
      },
      merchantRedirectUrl: `${baseUrl}/subscription-success`,
      merchantAgreementUrl: `${baseUrl}/my-account/subscription`, // Stadig påkrævet af Vipps
      phoneNumber: phoneNumber,
      productName: productName,
      // 2. Tilføj 'scope' her i payload'et
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
    
    // 3. FJERN databasekaldet herfra. Det håndteres af webhook'en.
    
    return NextResponse.json({ 
      vippsConfirmationUrl: data.vippsConfirmationUrl, 
      agreementId: data.agreementId 
    });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}