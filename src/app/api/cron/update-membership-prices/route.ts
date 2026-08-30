// src/app/api/cron/update-membership-prices/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getVippsAccessToken } from '@/lib/vipps';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const NEW_PRICES: Record<string, number> = {
  Træning: 25000,
  Kamphold: 45000,
};

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log(`Membership price update started: ${new Date().toISOString()}`);

  try {
    const result = await pool.query(
      `SELECT vipps_agreement_id, membership_type, price_in_ore
       FROM subscriptions
       WHERE status IN ('ACTIVE', 'SUSPENDED')
         AND (
           (membership_type = 'Træning' AND price_in_ore IS DISTINCT FROM $1)
           OR (membership_type = 'Kamphold' AND price_in_ore IS DISTINCT FROM $2)
         )`,
      [NEW_PRICES.Træning, NEW_PRICES.Kamphold]
    );

    const subscriptionsToUpdate = result.rows;

    if (subscriptionsToUpdate.length === 0) {
      return NextResponse.json({ message: 'No subscriptions need a price update.' });
    }

    console.log(`Found ${subscriptionsToUpdate.length} subscriptions to update.`);
    const accessToken = await getVippsAccessToken();

    const updateResults = await Promise.all(
      subscriptionsToUpdate.map(async (sub) => {
        const { vipps_agreement_id, membership_type, price_in_ore } = sub;
        const newPrice = NEW_PRICES[membership_type];

        if (!newPrice) {
          return {
            success: false,
            agreementId: vipps_agreement_id,
            error: `Unknown membership type: ${membership_type}`,
          };
        }

        const response = await fetch(
          `${process.env.VIPPS_API_BASE_URL}/recurring/v3/agreements/${vipps_agreement_id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'Ocp-Apim-Subscription-Key': process.env.VIPPS_RECURRING_SUB_KEY!,
              'Merchant-Serial-Number': process.env.VIPPS_MSN!,
              'Idempotency-Key': uuidv4(),
            },
            body: JSON.stringify({ pricing: { amount: newPrice } }),
          }
        );

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Failed to PATCH agreement ${vipps_agreement_id}:`, errorBody);
          return { success: false, agreementId: vipps_agreement_id, error: errorBody };
        }

        try {
          await pool.query(
            `UPDATE subscriptions
             SET price_in_ore = $1, updated_at = CURRENT_TIMESTAMP
             WHERE vipps_agreement_id = $2`,
            [newPrice, vipps_agreement_id]
          );
          console.log(
            `Updated ${vipps_agreement_id} from ${price_in_ore} to ${newPrice} øre.`
          );
          return {
            success: true,
            agreementId: vipps_agreement_id,
            from: price_in_ore,
            to: newPrice,
          };
        } catch (dbError) {
          console.error(
            `CRITICAL DB_UPDATE_FAILED: Vipps agreement ${vipps_agreement_id} was patched, but price_in_ore was not updated.`,
            dbError
          );
          return { success: false, agreementId: vipps_agreement_id, error: 'DB_UPDATE_FAILED' };
        }
      })
    );

    return NextResponse.json({
      message: 'Membership price update completed.',
      results: updateResults,
    });
  } catch (error) {
    console.error('Membership price update failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
