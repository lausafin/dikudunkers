// src/app/api/recurring/get-status/route.ts
import { NextResponse } from 'next/server';
import { getVippsAccessToken } from '@/lib/vipps';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agreementId = searchParams.get('agreementId');

  if (!agreementId) {
    return NextResponse.json({ error: 'Agreement ID is required' }, { status: 400 });
  }

  try {
    const accessToken = await getVippsAccessToken();
    
    // === ÆNDRINGEN ER HER: VI KALDER VIPPS API DIREKTE ===
    const response = await fetch(`${process.env.VIPPS_API_BASE_URL}/recurring/v3/agreements/${agreementId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
        'Merchant-Serial-Number': process.env.VIPPS_MSN!,
      },
      // Tilføj cache: 'no-store' for at sikre, at vi altid får den seneste status
      cache: 'no-store', 
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch agreement status from Vipps. Status: ${response.status}`);
    }

    const data = await response.json();
    
    // Vi returnerer status direkte fra Vipps' svar
    return NextResponse.json({ status: data.status });
    // =======================================================

  } catch (error) {
     console.error("Error fetching real-time agreement status:", error);
     const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
     return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}