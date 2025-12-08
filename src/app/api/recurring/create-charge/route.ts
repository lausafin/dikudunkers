// app/api/recurring/create-charge/route.ts
import { NextResponse } from 'next/server';
import { getVippsAccessToken } from '@/lib/vipps';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { agreementId, amount, description, due } = await request.json();

  // Basic input validation to prevent bad requests to Vipps
  if (!agreementId || typeof agreementId !== 'string') {
    return NextResponse.json({ error: 'agreementId is required' }, { status: 400 });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number (øre)' }, { status: 400 });
  }

  if (!description || typeof description !== 'string') {
    return NextResponse.json({ error: 'description is required' }, { status: 400 });
  }

  if (!due || typeof due !== 'string') {
    return NextResponse.json({ error: 'due is required (YYYY-MM-DD)' }, { status: 400 });
  }

  // Enforce due date at least 2 days in future (Vipps requirement)
  const dueDate = new Date(due + 'T00:00:00Z');
  const minDue = new Date();
  minDue.setUTCDate(minDue.getUTCDate() + 2);
  if (Number.isNaN(dueDate.getTime()) || dueDate < minDue) {
    return NextResponse.json({ error: 'due must be at least 2 days in the future (YYYY-MM-DD)' }, { status: 400 });
  }
  
  try {
    const accessToken = await getVippsAccessToken();
    const chargePayload = {
      amount: amount, // i øre
      description: description,
      due: due, // Format: "YYYY-MM-DD", skal være mindst 2 dage ude i fremtiden
      retryDays: 2, // Vipps prøver i 2 dage hvis betalingen fejler
      transactionType: "DIRECT_CAPTURE",
      orderId: `charge-${agreementId}-${due}` // Et unikt ID for betalingen
    };

    const response = await fetch(`${process.env.VIPPS_API_BASE_URL}/recurring/v3/agreements/${agreementId}/charges`, {
       method: 'POST',
       headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
        'Merchant-Serial-Number': process.env.VIPPS_MSN!,
        'Idempotency-Key': uuidv4(),
       },
       body: JSON.stringify(chargePayload),
    });

    if (!response.ok) {
        throw new Error(`Failed to create charge for agreement ${agreementId}`);
    }
    
    return NextResponse.json({ success: true, message: `Charge created for ${agreementId}` });

  } catch (error) {
     // BRUG 'error' VARIABLEN HER:
     console.error("Error fetching agreement status:", error);
     const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
     return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}